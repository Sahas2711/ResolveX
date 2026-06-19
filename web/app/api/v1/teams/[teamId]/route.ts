// =============================================================================
// ResolveX — Teams Detail & Mutation API
// GET    /api/v1/teams/{teamId} → Get team details
// PUT    /api/v1/teams/{teamId} → Update team name & description
// DELETE /api/v1/teams/{teamId} → Soft-delete team
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
  updateTeamSchema,
  toTeamResponse,
} from "@/lib/validators/team";

// ── Shared: Fetch team by ID (used by GET, PUT & DELETE) ───────────────────

async function findTeamOrNull(teamId: string) {
  return prisma.team.findFirst({
    where: { id: teamId, deletedAt: null },
    select: {
      id: true,
      teamName: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// ── GET: Get Team by ID ────────────────────────────────────────────────────

/**
 * GET /api/v1/teams/{teamId}
 *
 * Returns a single team by its UUID. Requires `team:read` permission.
 * Returns 404 if the team does not exist or has been soft-deleted.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const ctx: Record<string, unknown> = {};

  try {
    const auth = await requirePermissions(request, Permissions.TEAM_READ);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    const { teamId } = await params;
    ctx.teamId = teamId;

    const team = await findTeamOrNull(teamId);

    if (!team) {
      return notFoundResponse("Team not found");
    }

    logger.info("Team fetched", ctx);
    return successResponse(toTeamResponse(team));
  } catch (error) {
    logger.error("Team fetch failed", ctx, error);
    return internalErrorResponse("Failed to fetch team");
  }
}

// ── PUT: Update Team ───────────────────────────────────────────────────────

/**
 * PUT /api/v1/teams/{teamId}
 *
 * Updates an existing team's name and optionally description.
 * Requires `team:update` permission.
 *
 * Request body (application/json):
 *   - name:        string (required, max 100)
 *   - description: string (optional, max 500)
 *
 * Responses:
 *   200 – Updated team
 *   404 – Team not found
 *   409 – Name conflicts with another team
 *   422 – Validation error
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const ctx: Record<string, unknown> = {};

  try {
    // ── Authorization ────────────────────────────────────────────────
    const auth = await requirePermissions(request, Permissions.TEAM_UPDATE);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // ── Extract teamId ───────────────────────────────────────────────
    const { teamId } = await params;
    ctx.teamId = teamId;

    // ── Verify team exists ───────────────────────────────────────────
    const existing = await findTeamOrNull(teamId);
    if (!existing) {
      return notFoundResponse("Team not found");
    }

    // ── Parse & Validate Body ────────────────────────────────────────
    const body = await request.json();
    const parsed = updateTeamSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      return validationErrorResponse(details);
    }

    const { name, description } = parsed.data;

    // ── Check for duplicate name (if name is being changed) ──────────
    if (name !== existing.teamName) {
      const duplicate = await prisma.team.findFirst({
        where: {
          teamName: name,
          id: { not: teamId },
          deletedAt: null,
        },
        select: { id: true },
      });

      if (duplicate) {
        return conflictResponse(
          `A team with the name "${name}" already exists`
        );
      }
    }

    // ── Build update payload ─────────────────────────────────────────
    const updateData: Record<string, unknown> = {
      teamName: name,
    };

    if (description !== undefined) {
      updateData.description = description || null;
    }

    // ── Execute update ───────────────────────────────────────────────
    const updated = await prisma.team.update({
      where: { id: teamId },
      data: updateData as any,
      select: {
        id: true,
        teamName: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info("Team updated", {
      ...ctx,
      teamName: updated.teamName,
      updatedFields: Object.keys(updateData),
    });

    return successResponse(toTeamResponse(updated));
  } catch (error) {
    logger.error("Team update failed", ctx, error);
    return internalErrorResponse("Failed to update team");
  }
}

// ── DELETE: Soft-Delete Team ───────────────────────────────────────────────

/**
 * DELETE /api/v1/teams/{teamId}
 *
 * Soft-deletes a team by setting its `deletedAt` timestamp.
 * Requires `team:delete` permission.
 *
 * Returns 409 Conflict if the team has active members, to prevent
 * orphaned memberships.
 *
 * Responses:
 *   204 – Successfully deleted
 *   404 – Team not found
 *   409 – Team has active members
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const ctx: Record<string, unknown> = {};

  try {
    // ── Authorization ────────────────────────────────────────────────
    const auth = await requirePermissions(request, Permissions.TEAM_DELETE);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // ── Extract teamId ───────────────────────────────────────────────
    const { teamId } = await params;
    ctx.teamId = teamId;

    // ── Verify team exists ───────────────────────────────────────────
    const existing = await findTeamOrNull(teamId);
    if (!existing) {
      return notFoundResponse("Team not found");
    }

    // ── Check for active members ─────────────────────────────────────
    const memberCount = await prisma.teamMember.count({
      where: { teamId },
    });

    if (memberCount > 0) {
      return conflictResponse(
        `Cannot delete team: ${memberCount} member(s) are still assigned to this team. Remove all members first.`
      );
    }

    // ── Check for active complaints assigned to this team ────────────
    const activeComplaintCount = await prisma.complaint.count({
      where: {
        assignedTeamId: teamId,
        deletedAt: null,
        currentStatus: {
          notIn: ["CLOSED", "RESOLVED"],
        },
      },
    });

    if (activeComplaintCount > 0) {
      return conflictResponse(
        `Cannot delete team: ${activeComplaintCount} active complaint(s) are assigned to this team`
      );
    }

    // ── Check for product team mappings ──────────────────────────────
    const mappingCount = await prisma.productTeamMapping.count({
      where: { teamId },
    });

    if (mappingCount > 0) {
      return conflictResponse(
        `Cannot delete team: ${mappingCount} product mapping(s) still reference this team. Remove all product mappings first.`
      );
    }

    // ── Soft-delete (set deletedAt) ──────────────────────────────────
    await prisma.team.update({
      where: { id: teamId },
      data: { deletedAt: new Date() },
    });

    logger.info("Team soft-deleted", {
      ...ctx,
      teamName: existing.teamName,
    });

    return noContentResponse();
  } catch (error) {
    logger.error("Team deletion failed", ctx, error);
    return internalErrorResponse("Failed to delete team");
  }
}
