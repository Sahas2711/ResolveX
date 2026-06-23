// =============================================================================
// ResolveX — Teams API
// GET  /api/v1/teams  → List teams with pagination & search
// POST /api/v1/teams  → Create a new team
// =============================================================================

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/permissions";
import { requirePermissions } from "@/lib/rbac";
import {
  createdResponse,
  successResponse,
  conflictResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";
import {
  createTeamSchema,
  listTeamsSchema,
  toTeamResponse,
} from "@/lib/validators/team";

// -- GET: List Teams --------------------------------------------------------

/**
 * GET /api/v1/teams
 *
 * Lists teams with search and pagination.
 * Requires `team:read` permission.
 *
 * Query parameters:
 *   - page:     integer (1-based, default 1)
 *   - pageSize: integer (1–100, default 20)
 *   - search:   string  (matches against teamName)
 */
export async function GET(request: Request) {
  const ctx: Record<string, unknown> = {};

  try {
    // -- Authorization ------------------------------------------------
    const auth = await requirePermissions(request, Permissions.TEAM_READ);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // -- Parse Query Parameters ---------------------------------------
    const url = new URL(request.url);
    const queryParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const parsed = listTeamsSchema.safeParse(queryParams);
    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      return validationErrorResponse(details);
    }

    const { page, pageSize, search } = parsed.data;

    // -- Build filters ------------------------------------------------
    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (search) {
      where.teamName = { contains: search, mode: "insensitive" };
    }

    // -- Execute query ------------------------------------------------
    const skip = (page - 1) * pageSize;

    const [teams, totalItems] = await Promise.all([
      prisma.team.findMany({
        where: where as any,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          teamName: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.team.count({ where: where as any }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    logger.info("Teams listed", {
      ...ctx,
      page,
      pageSize,
      totalItems,
      filters: { search },
    });

    return successResponse(teams.map(toTeamResponse), {
      page,
      pageSize,
      totalItems,
      totalPages,
    });
  } catch (error) {
    logger.error("Team listing failed", ctx, error);
    return internalErrorResponse("Failed to list teams");
  }
}

// -- POST: Create Team ------------------------------------------------------

/**
 * POST /api/v1/teams
 *
 * Creates a new team. Requires `team:create` permission.
 *
 * Request body (application/json):
 *   - name:        string (required, max 100)
 *   - description: string (optional, max 500)
 */
export async function POST(request: Request) {
  const ctx: Record<string, unknown> = {};

  try {
    // -- Authorization ------------------------------------------------
    const auth = await requirePermissions(request, Permissions.TEAM_CREATE);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // -- Parse & Validate Body ----------------------------------------
    const body = await request.json();
    const parsed = createTeamSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      return validationErrorResponse(details);
    }

    const { name, description } = parsed.data;

    // -- Check for duplicate team name --------------------------------
    const existingTeam = await prisma.team.findFirst({
      where: { teamName: name, deletedAt: null },
      select: { id: true },
    });

    if (existingTeam) {
      return conflictResponse(`A team with the name "${name}" already exists`);
    }

    // -- Create team --------------------------------------------------
    const team = await prisma.team.create({
      data: {
        teamName: name,
        description: description || null,
      },
      select: {
        id: true,
        teamName: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info("Team created", {
      ...ctx,
      teamId: team.id,
      teamName: team.teamName,
    });

    return createdResponse(toTeamResponse(team));
  } catch (error) {
    logger.error("Team creation failed", ctx, error);
    return internalErrorResponse("Failed to create team");
  }
}
