// =============================================================================
// ResolveX — Team Members API
// GET    /api/v1/teams/{teamId}/members → List team members
// POST   /api/v1/teams/{teamId}/members → Add member to team
// DELETE /api/v1/teams/{teamId}/members → Remove member from team
// =============================================================================

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/permissions";
import { requirePermissions } from "@/lib/rbac";
import {
  successResponse,
  createdResponse,
  noContentResponse,
  notFoundResponse,
  conflictResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";
import {
  addMemberSchema,
  toTeamMemberResponse,
} from "@/lib/validators/team";

// ── GET: List Team Members ─────────────────────────────────────────────────

/**
 * GET /api/v1/teams/{teamId}/members
 *
 * Lists all members of a team. Requires `team:read` permission.
 * Returns 404 if the team does not exist.
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

    // ── Verify team exists ───────────────────────────────────────────
    const team = await prisma.team.findFirst({
      where: { id: teamId, deletedAt: null },
      select: { id: true },
    });

    if (!team) {
      return notFoundResponse("Team not found");
    }

    // ── Fetch members ────────────────────────────────────────────────
    const members = await prisma.teamMember.findMany({
      where: { teamId },
      select: {
        userId: true,
        role: true,
        joinedAt: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            userRoles: {
              select: {
                role: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    logger.info("Team members listed", {
      ...ctx,
      memberCount: members.length,
    });

    return successResponse(members.map(toTeamMemberResponse));
  } catch (error) {
    logger.error("Team members listing failed", ctx, error);
    return internalErrorResponse("Failed to list team members");
  }
}

// ── POST: Add Member to Team ───────────────────────────────────────────────

/**
 * POST /api/v1/teams/{teamId}/members
 *
 * Adds a user as a member of the team. Requires `team:update` permission
 * (matching the API spec's security scheme).
 *
 * Request body (application/json):
 *   - userId: string (required, UUID)
 *   - role:   "lead" | "member" (required)
 *
 * Responses:
 *   201 – Member added successfully
 *   404 – Team or user not found
 *   409 – User is already a member of this team
 *   422 – Validation error
 */
export async function POST(
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
    const team = await prisma.team.findFirst({
      where: { id: teamId, deletedAt: null },
      select: { id: true, teamName: true },
    });

    if (!team) {
      return notFoundResponse("Team not found");
    }

    // ── Parse & Validate Body ────────────────────────────────────────
    const body = await request.json();
    const parsed = addMemberSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      return validationErrorResponse(details);
    }

    const { userId, role } = parsed.data;

    // ── Verify user exists ───────────────────────────────────────────
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!user) {
      return notFoundResponse("User not found");
    }

    // ── Check if already a member ────────────────────────────────────
    const existingMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    if (existingMember) {
      return conflictResponse("User is already a member of this team");
    }

    // ── Add member ───────────────────────────────────────────────────
    const member = await prisma.teamMember.create({
      data: {
        teamId,
        userId,
        role: role === "lead" ? "LEAD" : "MEMBER",
      },
      select: {
        userId: true,
        role: true,
        joinedAt: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            userRoles: {
              select: {
                role: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    logger.info("Team member added", {
      ...ctx,
      teamName: team.teamName,
      memberUserId: userId,
      memberRole: role,
    });

    return createdResponse(toTeamMemberResponse(member));
  } catch (error) {
    logger.error("Team member addition failed", ctx, error);
    return internalErrorResponse("Failed to add team member");
  }
}

// ── DELETE: Remove Member from Team ────────────────────────────────────────

/**
 * DELETE /api/v1/teams/{teamId}/members?userId={userId}
 *
 * Removes a member from the team. Requires `team:update` permission
 * (matching the API spec's security scheme).
 *
 * Query parameters:
 *   - userId: string (required, UUID)
 *
 * Responses:
 *   204 – Member removed successfully
 *   404 – Team or membership not found
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const ctx: Record<string, unknown> = {};

  try {
    // ── Authorization ────────────────────────────────────────────────
    const auth = await requirePermissions(request, Permissions.TEAM_UPDATE);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // ── Extract teamId and userId ────────────────────────────────────
    const { teamId } = await params;
    ctx.teamId = teamId;

    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return validationErrorResponse([
        {
          field: "userId",
          message: "userId query parameter is required",
          constraint: "required",
        },
      ]);
    }

    ctx.memberUserId = userId;

    // ── Verify team exists ───────────────────────────────────────────
    const team = await prisma.team.findFirst({
      where: { id: teamId, deletedAt: null },
      select: { id: true, teamName: true },
    });

    if (!team) {
      return notFoundResponse("Team not found");
    }

    // ── Verify membership exists ─────────────────────────────────────
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    if (!membership) {
      return notFoundResponse("User is not a member of this team");
    }

    // ── Remove member ────────────────────────────────────────────────
    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } },
    });

    logger.info("Team member removed", {
      ...ctx,
      teamName: team.teamName,
      removedUserId: userId,
    });

    return noContentResponse();
  } catch (error) {
    logger.error("Team member removal failed", ctx, error);
    return internalErrorResponse("Failed to remove team member");
  }
}
