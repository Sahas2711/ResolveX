// =============================================================================
// ResolveX — Products Detail & Mutation API
// GET    /api/v1/products/{productId} → Get product details
// PUT    /api/v1/products/{productId} → Update product
// DELETE /api/v1/products/{productId} → Soft-delete product
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
  updateProductSchema,
  mapApiStatusToPrisma,
  toProductResponse,
} from "@/lib/validators/product";

// ── Shared: Fetch product by ID (used by PUT & GET) ────────────────────────

async function findProductOrNull(productId: string) {
  return prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: {
      id: true,
      productName: true,
      description: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// ── GET: Get Product by ID ─────────────────────────────────────────────────

/**
 * GET /api/v1/products/{productId}
 *
 * Returns a single product by its UUID. Requires `product:read` permission.
 * Returns 404 if the product does not exist or has been soft-deleted.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const ctx: Record<string, unknown> = {};

  try {
    const auth = await requirePermissions(request, Permissions.PRODUCT_READ);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    const { productId } = await params;
    ctx.productId = productId;

    const product = await findProductOrNull(productId);

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

// ── PUT: Update Product ────────────────────────────────────────────────────

/**
 * PUT /api/v1/products/{productId}
 *
 * Updates an existing product. Requires `product:update` permission.
 * Only the fields provided in the request body are updated (partial update).
 *
 * Request body (application/json, all optional):
 *   - name:        string (max 100)
 *   - description: string (max 500)
 *   - status:      "active" | "inactive"
 *
 * Responses:
 *   200 – Updated product
 *   404 – Product not found
 *   409 – Name conflicts with another product
 *   422 – Validation error
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const ctx: Record<string, unknown> = {};

  try {
    // ── Authorization ────────────────────────────────────────────────
    const auth = await requirePermissions(request, Permissions.PRODUCT_UPDATE);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // ── Extract productId ────────────────────────────────────────────
    const { productId } = await params;
    ctx.productId = productId;

    // ── Verify product exists ────────────────────────────────────────
    const existing = await findProductOrNull(productId);
    if (!existing) {
      return notFoundResponse("Product not found");
    }

    // ── Parse & Validate Body ────────────────────────────────────────
    const body = await request.json();
    const parsed = updateProductSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      return validationErrorResponse(details);
    }

    const { name, description, status } = parsed.data;

    // ── Check for duplicate name (if name is being changed) ──────────
    if (name && name !== existing.productName) {
      const duplicate = await prisma.product.findFirst({
        where: {
          productName: name,
          id: { not: productId },
          deletedAt: null,
        },
        select: { id: true },
      });

      if (duplicate) {
        return conflictResponse(
          `A product with the name "${name}" already exists`
        );
      }
    }

    // ── Build update payload (only provided fields) ──────────────────
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      updateData.productName = name;
    }
    if (description !== undefined) {
      updateData.description = description || null;
    }
    if (status !== undefined) {
      updateData.status = mapApiStatusToPrisma(status);
    }

    // ── Execute update ───────────────────────────────────────────────
    const updated = await prisma.product.update({
      where: { id: productId },
      data: updateData as any,
      select: {
        id: true,
        productName: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info("Product updated", {
      ...ctx,
      productName: updated.productName,
      updatedFields: Object.keys(updateData),
    });

    return successResponse(toProductResponse(updated));
  } catch (error) {
    logger.error("Product update failed", ctx, error);
    return internalErrorResponse("Failed to update product");
  }
}

// ── DELETE: Soft-Delete Product ────────────────────────────────────────────

/**
 * DELETE /api/v1/products/{productId}
 *
 * Soft-deletes a product by setting its `deletedAt` timestamp.
 * Requires `product:delete` permission.
 *
 * Returns 409 Conflict if the product has any active (non-deleted)
 * complaints associated with it, to prevent orphaned references.
 *
 * Responses:
 *   204 – Successfully deleted
 *   404 – Product not found
 *   409 – Product has active complaints
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const ctx: Record<string, unknown> = {};

  try {
    // ── Authorization ────────────────────────────────────────────────
    const auth = await requirePermissions(request, Permissions.PRODUCT_DELETE);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // ── Extract productId ────────────────────────────────────────────
    const { productId } = await params;
    ctx.productId = productId;

    // ── Verify product exists ────────────────────────────────────────
    const existing = await findProductOrNull(productId);
    if (!existing) {
      return notFoundResponse("Product not found");
    }

    // ── Check for active complaints ──────────────────────────────────
    const activeComplaintCount = await prisma.complaint.count({
      where: {
        productId,
        deletedAt: null,
        currentStatus: {
          notIn: ["CLOSED", "RESOLVED"],
        },
      },
    });

    if (activeComplaintCount > 0) {
      return conflictResponse(
        `Cannot delete product: ${activeComplaintCount} active complaint(s) are linked to this product`
      );
    }

    // ── Soft-delete (set deletedAt) ──────────────────────────────────
    await prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date() },
    });

    logger.info("Product soft-deleted", {
      ...ctx,
      productName: existing.productName,
    });

    return noContentResponse();
  } catch (error) {
    logger.error("Product deletion failed", ctx, error);
    return internalErrorResponse("Failed to delete product");
  }
}
