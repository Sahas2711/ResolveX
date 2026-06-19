// =============================================================================
// RBAC — Role-Based Access Control
// Server-side authorization utilities for API route handlers.
// Relies on headers set by proxy.ts (x-user-id, x-user-email, x-user-roles).
// =============================================================================

import prisma from "@/lib/prisma";
import { forbiddenResponse, internalErrorResponse } from "@/lib/response";
import { logger } from "@/lib/logger";
import type { PermissionKey } from "@/lib/permissions";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AuthUser {
  userId: string;
  email: string;
  roleIds: string[];
}

export type AuthResult =
  | { user: AuthUser; allowed: true; response: null }
  | { user: AuthUser; allowed: false; response: Response };

// ── Extract user from proxy-set headers ────────────────────────────────────

/**
 * Extracts the authenticated user from request headers set by the proxy.
 * Returns `null` if the headers are missing (should not happen behind the proxy).
 */
export function getUserFromRequest(request: Request): AuthUser | null {
  const userId = request.headers.get("x-user-id");
  const email = request.headers.get("x-user-email");
  const roleIdsRaw = request.headers.get("x-user-roles");

  if (!userId || !email || !roleIdsRaw) {
    return null;
  }

  try {
    const roleIds: string[] = JSON.parse(roleIdsRaw);
    return { userId, email, roleIds };
  } catch {
    return null;
  }
}

// ── Database permission lookups ────────────────────────────────────────────

/**
 * Fetches all permission keys assigned to a user through their roles.
 * Orders by role name for deterministic results.
 */
export async function getUserPermissions(
  userId: string,
): Promise<PermissionKey[]> {
  const roles = await prisma.userRole.findMany({
    where: { userId },
    select: {
      role: {
        select: {
          rolePermissions: {
            select: {
              permission: {
                select: { name: true },
              },
            },
          },
        },
      },
    },
  });

  const permissionSet = new Set<PermissionKey>();
  for (const userRole of roles) {
    for (const rp of userRole.role.rolePermissions) {
      permissionSet.add(rp.permission.name as PermissionKey);
    }
  }

  return Array.from(permissionSet).sort();
}

/**
 * Fetches the role names a user is assigned.
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    select: {
      role: {
        select: { name: true },
      },
    },
  });

  return userRoles.map((ur: { role: { name: string } }) => ur.role.name).sort();
}

// ── Authorization checks ───────────────────────────────────────────────────

/**
 * Checks that the authenticated user (from the proxy-set headers) has ALL
 * of the required permissions.
 *
 * Usage in API routes:
 *
 * ```ts
 * const auth = await requirePermissions(request, Permissions.COMPLAINT_CREATE);
 * if (!auth.allowed) return auth.response;
 * // safe to proceed — user has the required permissions
 * ```
 *
 * @param request – The incoming Next.js Request object
 * @param requiredPermissions – One or more PermissionKey values to check
 * @returns `AuthResult` with either a 403 response or the auth user
 */
export async function requirePermissions(
  request: Request,
  ...requiredPermissions: PermissionKey[]
): Promise<AuthResult> {
  const user = getUserFromRequest(request);

  if (!user) {
    logger.warn("RBAC: no auth headers on request");
    return {
      user: null as unknown as AuthUser,
      allowed: false,
      response: forbiddenResponse("Authentication required"),
    };
  }

  if (requiredPermissions.length === 0) {
    return { user, allowed: true, response: null };
  }

  try {
    const userPerms = await getUserPermissions(user.userId);
    const hasAll = requiredPermissions.every((p) => userPerms.includes(p));

    if (!hasAll) {
      logger.warn("RBAC: insufficient permissions", {
        userId: user.userId,
        required: requiredPermissions,
        userPerms,
      });

      return {
        user,
        allowed: false,
        response: forbiddenResponse("Insufficient permissions"),
      };
    }

    return { user, allowed: true, response: null };
  } catch (error) {
    logger.error("RBAC: permission lookup failed", { userId: user.userId }, error);
    return {
      user,
      allowed: false,
      response: internalErrorResponse("Authorization check failed"),
    };
  }
}

/**
 * Checks that the authenticated user has at least ONE of the required roles.
 *
 * @param request – The incoming Next.js Request object
 * @param requiredRoles – One or more role name values to check
 * @returns `AuthResult` with either a 403 response or the auth user
 */
export async function requireRoles(
  request: Request,
  ...requiredRoles: string[]
): Promise<AuthResult> {
  const user = getUserFromRequest(request);

  if (!user) {
    logger.warn("RBAC: no auth headers on request");
    return {
      user: null as unknown as AuthUser,
      allowed: false,
      response: forbiddenResponse("Authentication required"),
    };
  }

  if (requiredRoles.length === 0) {
    return { user, allowed: true, response: null };
  }

  try {
    const userRoleNames = await getUserRoles(user.userId);
    const hasRole = requiredRoles.some((r) => userRoleNames.includes(r));

    if (!hasRole) {
      logger.warn("RBAC: insufficient role", {
        userId: user.userId,
        required: requiredRoles,
        userRoles: userRoleNames,
      });

      return {
        user,
        allowed: false,
        response: forbiddenResponse("Insufficient role for this action"),
      };
    }

    return { user, allowed: true, response: null };
  } catch (error) {
    logger.error("RBAC: role lookup failed", { userId: user.userId }, error);
    return {
      user,
      allowed: false,
      response: internalErrorResponse("Authorization check failed"),
    };
  }
}

/**
 * Convenience: checks that the authenticated user has ALL required permissions
 * AND at least ONE of the required roles.
 */
export async function authorize(
  request: Request,
  options: {
    permissions?: PermissionKey[];
    roles?: string[];
  } = {},
): Promise<AuthResult> {
  if (options.permissions && options.permissions.length > 0) {
    const permResult = await requirePermissions(request, ...options.permissions);
    if (!permResult.allowed) return permResult;
  }

  if (options.roles && options.roles.length > 0) {
    const roleResult = await requireRoles(request, ...options.roles);
    if (!roleResult.allowed) return roleResult;
  }

  // If no specific checks, just return the user
  const user = getUserFromRequest(request);
  if (!user) {
    return {
      user: null as unknown as AuthUser,
      allowed: false,
      response: forbiddenResponse("Authentication required"),
    };
  }

  return { user, allowed: true, response: null };
}
