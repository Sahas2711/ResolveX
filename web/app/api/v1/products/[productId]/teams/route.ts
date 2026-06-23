// =============================================================================
// ResolveX — Product-Team Mapping API
// GET    /api/v1/products/{productId}/teams → List teams mapped to product
// POST   /api/v1/products/{productId}/teams → Map a team to product
// DELETE /api/v1/products/{productId}/teams → Remove team mapping
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
  mapTeamSchema,
  toProductTeamMappingResponse,
} from "@/lib/validators/team";

// -- GET: List Teams Mapped to Product --------------------------------------

/**
 * GET /api/v1/products/{productId}/teams
 *
 * Lists all teams mapped to a product. Requires `product:read` permission.
 * Returns an array of ProductTeamMapping objects with team details.
 *
 * Responses:
 *   200 – Array of team mappings
 *   404 – Product not found
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const ctx: Record<string, unknown> = {};

  try {
    // -- Authorization ------------------------------------------------
    const auth = await requirePermissions(request, Permissions.PRODUCT_READ);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // -- Extract productId --------------------------------------------
    const { productId } = await params;
    ctx.productId = productId;

    // -- Verify product exists ----------------------------------------
    const product = await prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      select: { id: true, productName: true },
    });

    if (!product) {
      return notFoundResponse("Product not found");
    }

    // -- Fetch team mappings ------------------------------------------
    const mappings = await prisma.productTeamMapping.findMany({
      where: { productId },
      select: {
        teamId: true,
        isPrimary: true,
        loadWeight: true,
        team: {
          select: { teamName: true },
        },
      },
      orderBy: [{ isPrimary: "desc" }, { loadWeight: "desc" }],
    });

    logger.info("Product team mappings listed", {
      ...ctx,
      productName: product.productName,
      mappingCount: mappings.length,
    });

    return successResponse(mappings.map(toProductTeamMappingResponse));
  } catch (error) {
    logger.error("Product team mappings listing failed", ctx, error);
    return internalErrorResponse("Failed to list team mappings");
  }
}

// -- POST: Map a Team to Product --------------------------------------------

/**
 * POST /api/v1/products/{productId}/teams
 *
 * Maps a support team to a product for auto-routing. Requires `product:update`
 * permission (matching the API spec's security scheme).
 *
 * Request body (application/json):
 *   - teamId:     string (required, UUID)
 *   - isPrimary:  boolean (optional, default false)
 *   - loadWeight: number  (optional, default 1.0, minimum 0.1)
 *
 * Responses:
 *   201 – Team mapped successfully
 *   404 – Product or team not found
 *   409 – Team is already mapped to this product
 *   422 – Validation error
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const ctx: Record<string, unknown> = {};

  try {
    // -- Authorization ------------------------------------------------
    const auth = await requirePermissions(request, Permissions.PRODUCT_UPDATE);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // -- Extract productId --------------------------------------------
    const { productId } = await params;
    ctx.productId = productId;

    // -- Verify product exists ----------------------------------------
    const product = await prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      select: { id: true, productName: true },
    });

    if (!product) {
      return notFoundResponse("Product not found");
    }

    // -- Parse & Validate Body ----------------------------------------
    const body = await request.json();
    const parsed = mapTeamSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      return validationErrorResponse(details);
    }

    const { teamId, isPrimary, loadWeight } = parsed.data;

    // -- Verify team exists -------------------------------------------
    const team = await prisma.team.findFirst({
      where: { id: teamId, deletedAt: null },
      select: { id: true, teamName: true },
    });

    if (!team) {
      return notFoundResponse("Team not found");
    }

    // -- Check for duplicate mapping ----------------------------------
    const existingMapping = await prisma.productTeamMapping.findUnique({
      where: { productId_teamId: { productId, teamId } },
    });

    if (existingMapping) {
      return conflictResponse("This team is already mapped to the product");
    }

    // -- If isPrimary, unset any existing primary mapping --------------
    if (isPrimary) {
      await prisma.productTeamMapping.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // -- Create mapping -----------------------------------------------
    const mapping = await prisma.productTeamMapping.create({
      data: {
        productId,
        teamId,
        isPrimary,
        loadWeight,
      },
      select: {
        teamId: true,
        isPrimary: true,
        loadWeight: true,
        team: {
          select: { teamName: true },
        },
      },
    });

    logger.info("Team mapped to product", {
      ...ctx,
      productName: product.productName,
      teamId,
      teamName: team.teamName,
      isPrimary,
      loadWeight,
    });

    return createdResponse(toProductTeamMappingResponse(mapping));
  } catch (error) {
    logger.error("Product team mapping failed", ctx, error);
    return internalErrorResponse("Failed to map team to product");
  }
}

// -- DELETE: Remove Team Mapping --------------------------------------------

/**
 * DELETE /api/v1/products/{productId}/teams?teamId={teamId}
 *
 * Removes a team mapping from a product. Requires `product:update` permission.
 *
 * Query parameters:
 *   - teamId: string (required, UUID)
 *
 * Responses:
 *   204 – Mapping removed successfully
 *   404 – Product or mapping not found
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const ctx: Record<string, unknown> = {};

  try {
    // -- Authorization ------------------------------------------------
    const auth = await requirePermissions(request, Permissions.PRODUCT_UPDATE);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // -- Extract productId and teamId ---------------------------------
    const { productId } = await params;
    ctx.productId = productId;

    const url = new URL(request.url);
    const teamId = url.searchParams.get("teamId");

    if (!teamId) {
      return validationErrorResponse([
        {
          field: "teamId",
          message: "teamId query parameter is required",
          constraint: "required",
        },
      ]);
    }

    ctx.mappedTeamId = teamId;

    // -- Verify product exists ----------------------------------------
    const product = await prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      select: { id: true, productName: true },
    });

    if (!product) {
      return notFoundResponse("Product not found");
    }

    // -- Verify mapping exists ----------------------------------------
    const mapping = await prisma.productTeamMapping.findUnique({
      where: { productId_teamId: { productId, teamId } },
      select: {
        team: { select: { teamName: true } },
      },
    });

    if (!mapping) {
      return notFoundResponse("Team mapping not found");
    }

    // -- Remove mapping -----------------------------------------------
    await prisma.productTeamMapping.delete({
      where: { productId_teamId: { productId, teamId } },
    });

    logger.info("Team mapping removed from product", {
      ...ctx,
      productName: product.productName,
      teamId,
      teamName: mapping.team.teamName,
    });

    return noContentResponse();
  } catch (error) {
    logger.error("Product team mapping removal failed", ctx, error);
    return internalErrorResponse("Failed to remove team mapping");
  }
}
