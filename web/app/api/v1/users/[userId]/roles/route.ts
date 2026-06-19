// =============================================================================
// ResolveX — User Role Management API
// POST   /api/v1/users/{userId}/roles  → Assign role(s) to user
// DELETE /api/v1/users/{userId}/roles  → Revoke a role from user
// =============================================================================

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/permissions";
import { requirePermissions } from "@/lib/rbac";
import {
  successResponse,
  noContentResponse,
  notFoundResponse,
  conflictResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";
import {
  assignRolesSchema,
  toUserResponse,
} from "@/lib/validators/user";

// ── POST: Assign Roles ─────────────────────────────────────────────────────

/**
 * POST /api/v1/users/{userId}/roles
 *
 * Assigns one or more roles to a user. Requires `user:manage` permission.
 *
 * Request body:
 *   - roleIds: string[] (required, min 1, UUIDs)
 *
 * Responses:
 *   200 – Roles assigned, returns updated user
 *   404 – User or role not found
 *   409 – All requested roles already assigned
 *   422 – Validation error
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ctx: Record<string, unknown> = {};

  try {
    const auth = await requirePermissions(request, Permissions.USER_MANAGE);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    const { userId } = await params;
    ctx.targetUserId = userId;

    // ── Verify user exists ───────────────────────────────────────────
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!user) {
      return notFoundResponse("User not found");
    }

    // ── Parse & Validate Body ────────────────────────────────────────
    const body = await request.json();
    const parsed = assignRolesSchema.safeParse(body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      return validationErrorResponse(details);
    }

    const { roleIds } = parsed.data;

    // ── Verify all roles exist ────────────────────────────────────────
    const existingRoles = await prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, name: true },
    });

    if (existingRoles.length !== roleIds.length) {
      const foundIds = new Set(existingRoles.map((r) => r.id));
      const missingIds = roleIds.filter((id) => !foundIds.has(id));
      return notFoundResponse(
        `Role(s) not found: ${missingIds.join(", ")}`
      );
    }

    // ── Filter out already-assigned roles ─────────────────────────────
    const existingAssignments = await prisma.userRole.findMany({
      where: { userId, roleId: { in: roleIds } },
      select: { roleId: true },
    });
    const assignedRoleIds = new Set(existingAssignments.map((a) => a.roleId));
    const newRoleIds = roleIds.filter((id) => !assignedRoleIds.has(id));

    if (newRoleIds.length === 0) {
      // Fetch full user for response
      const fullUser = await findFullUser(userId);
      if (!fullUser) return notFoundResponse("User not found");
      return successResponse(toUserResponse(fullUser));
    }

    // ── Assign roles ─────────────────────────────────────────────────
    await prisma.userRole.createMany({
      data: newRoleIds.map((roleId) => ({ userId, roleId })),
    });

    logger.info("Roles assigned to user", {
      ...ctx,
      assignedRoles: existingRoles
        .filter((r) => newRoleIds.includes(r.id))
        .map((r) => r.name),
    });

    // ── Return updated user ──────────────────────────────────────────
    const updatedUser = await findFullUser(userId);
    if (!updatedUser) return notFoundResponse("User not found");
    return successResponse(toUserResponse(updatedUser));
  } catch (error) {
    logger.error("Role assignment failed", ctx, error);
    return internalErrorResponse("Failed to assign roles");
  }
}

// ── DELETE: Revoke Role ────────────────────────────────────────────────────

/**
 * DELETE /api/v1/users/{userId}/roles?roleId={roleId}
 *
 * Revokes a specific role from a user. Requires `user:manage` permission.
 *
 * Query parameters:
 *   - roleId: string (required, UUID)
 *
 * Responses:
 *   204 – Role revoked
 *   404 – User or role assignment not found
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ctx: Record<string, unknown> = {};

  try {
    const auth = await requirePermissions(request, Permissions.USER_MANAGE);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    const { userId } = await params;
    ctx.targetUserId = userId;

    // ── Extract roleId from query ────────────────────────────────────
    const url = new URL(request.url);
    const roleId = url.searchParams.get("roleId");

    if (!roleId) {
      return validationErrorResponse([
        {
          field: "roleId",
          message: "roleId query parameter is required",
          constraint: "required",
        },
      ]);
    }

    // ── Verify user exists ───────────────────────────────────────────
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!user) {
      return notFoundResponse("User not found");
    }

    // ── Verify role assignment exists ────────────────────────────────
    const assignment = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
    });
    if (!assignment) {
      return notFoundResponse("Role assignment not found");
    }

    // ── Revoke role ─────────────────────────────────────────────────
    await prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });

    logger.info("Role revoked from user", {
      ...ctx,
      revokedRoleId: roleId,
    });

    return noContentResponse();
  } catch (error) {
    logger.error("Role revocation failed", ctx, error);
    return internalErrorResponse("Failed to revoke role");
  }
}

// ── Helper: fetch full user with roles ─────────────────────────────────────

async function findFullUser(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      employeeId: true,
      isActive: true,
      status: true,
      profileImageUrl: true,
      createdAt: true,
      updatedAt: true,
      userRoles: {
        select: {
          role: { select: { name: true } },
        },
      },
    },
  });
}
