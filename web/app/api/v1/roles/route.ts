// =============================================================================
// ResolveX — Roles API
// GET /api/v1/roles → List all roles
// =============================================================================

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/permissions";
import { requirePermissions } from "@/lib/rbac";
import { successResponse, internalErrorResponse } from "@/lib/response";

/**
 * GET /api/v1/roles
 *
 * Returns all available roles. Requires `role:read` permission (admin only).
 * Used by the user detail page to populate the "Assign roles" modal.
 *
 * Responses:
 *   200 – Array of { id, name } role objects
 *   403 – Insufficient permissions
 */
export async function GET(request: Request) {
  try {
    // -- Authorization ------------------------------------------------
    const auth = await requirePermissions(request, Permissions.ROLE_READ);
    if (!auth.allowed) return auth.response;

    // -- Fetch all roles ----------------------------------------------
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    logger.info("Roles listed", {
      userId: auth.user.userId,
      count: roles.length,
    });

    return successResponse(roles);
  } catch (error) {
    logger.error("Roles listing failed", {}, error);
    return internalErrorResponse("Failed to list roles");
  }
}
