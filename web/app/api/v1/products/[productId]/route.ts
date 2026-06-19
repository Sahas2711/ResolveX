// =============================================================================
// ResolveX — Products Detail API
// GET /api/v1/products/{productId} → Get product details
// =============================================================================

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/permissions";
import { requirePermissions } from "@/lib/rbac";
import {
  successResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@/lib/response";
import { toProductResponse } from "@/lib/validators/product";

// ── GET: Get Product by ID ─────────────────────────────────────────────────

/**
 * GET /api/v1/products/{productId}
 *
 * Returns a single product by its UUID. Requires `product:read` permission.
 * Returns 404 if the product does not exist or has been soft-deleted.
 *
 * Path parameters:
 *   - productId: string (UUID)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const ctx: Record<string, unknown> = {};

  try {
    // ── Authorization ────────────────────────────────────────────────
    const auth = await requirePermissions(request, Permissions.PRODUCT_READ);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // ── Extract productId ────────────────────────────────────────────
    const { productId } = await params;
    ctx.productId = productId;

    // ── Fetch product ────────────────────────────────────────────────
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
      },
      select: {
        id: true,
        productName: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!product) {
      return notFoundResponse("Product not found");
    }

    logger.info("Product fetched", ctx);

    return successResponse(toProductResponse(product));
  } catch (error) {
    logger.error("Product fetch failed", ctx, error);
    return internalErrorResponse("Failed to fetch product");
  }
}
