import prisma from "@/lib/prisma";
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@/lib/response";
import { getUserFromRequest } from "@/lib/rbac";
import { logger } from "@/lib/logger";

/**
 * GET /api/v1/auth/me
 *
 * Returns the authenticated user's profile with resolved role names
 * and permission keys. Useful for client-side permission checks.
 *
 * Protected by the auth proxy — requires a valid Bearer token.
 */
export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);

    if (!user) {
      return unauthorizedResponse("Authentication required");
    }

    // Fetch user profile
    const profile = await prisma.user.findUnique({
      where: { id: user.userId },
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
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
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
        },
      },
    });

    if (!profile) {
      logger.warn("Auth/me: user not found in DB", { userId: user.userId });
      return notFoundResponse("User not found");
    }

    // Resolve role names and permissions
    const roles = profile.userRoles.map((ur) => ur.role.name);
    const permissionSet = new Set<string>();
    for (const ur of profile.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        permissionSet.add(rp.permission.name);
      }
    }

    return successResponse({
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      employeeId: profile.employeeId,
      isActive: profile.isActive,
      status: profile.status,
      profileImageUrl: profile.profileImageUrl,
      createdAt: profile.createdAt,
      roles,
      permissions: Array.from(permissionSet).sort(),
    });
  } catch (error) {
    logger.error("Auth/me: unexpected error", { userId: "unknown" }, error);
    return internalErrorResponse("Failed to fetch user profile");
  }
}
