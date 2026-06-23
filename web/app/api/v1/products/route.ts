// =============================================================================
// ResolveX — Products API
// POST   /api/v1/products  → Create a new product
// GET    /api/v1/products  → List/search products with pagination
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
  createProductSchema,
  listProductsSchema,
  mapApiStatusToPrisma,
  toProductResponse,
} from "@/lib/validators/product";

/**
 * Auto-generates a unique product code (matches employeeId pattern style).
 */
function generateProductCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PRD-${ts}-${rand}`;
}

// -- POST: Create Product ---------------------------------------------------

/**
 * POST /api/v1/products
 *
 * Creates a new product. Requires `product:create` permission.
 * Auto-generates `productCode` and uses the first available
 * ProductCategory when none is specified.
 *
 * Request body (application/json):
 *   - name:        string (required, max 100)
 *   - description: string (optional, max 500)
 *   - status:      "active" | "inactive" (optional, default "active")
 */
export async function POST(request: Request) {
  const ctx: Record<string, unknown> = {};

  try {
    // -- Authorization ------------------------------------------------
    const auth = await requirePermissions(request, Permissions.PRODUCT_CREATE);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // -- Parse & Validate Body ----------------------------------------
    const body = await request.json();
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      return validationErrorResponse(details);
    }

    const { name, description, status } = parsed.data;
    const prismaStatus = mapApiStatusToPrisma(status);

    // -- Check for duplicate product name -----------------------------
    const existingProduct = await prisma.product.findFirst({
      where: { productName: name, deletedAt: null },
      select: { id: true },
    });

    if (existingProduct) {
      return conflictResponse(`A product with the name "${name}" already exists`);
    }

    // -- Create product -----------------------------------------------
    const product = await prisma.product.create({
      data: {
        productCode: generateProductCode(),
        productName: name,
        description: description || null,
        status: prismaStatus,
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

    logger.info("Product created", {
      ...ctx,
      productId: product.id,
      productName: product.productName,
    });

    return createdResponse(toProductResponse(product));
  } catch (error) {
    logger.error("Product creation failed", ctx, error);
    return internalErrorResponse("Failed to create product");
  }
}

// -- GET: List Products -----------------------------------------------------

/**
 * GET /api/v1/products
 *
 * Lists products with search, status filter, and pagination.
 * Requires `product:read` permission.
 *
 * Query parameters:
 *   - page:      integer (1-based, default 1)
 *   - pageSize:  integer (1–100, default 20)
 *   - search:    string  (matches against productName and description)
 *   - status:    "active" | "inactive"
 *   - sort:      sort field(s) prefixed with +/- (default "-createdAt")
 */
export async function GET(request: Request) {
  const ctx: Record<string, unknown> = {};

  try {
    // -- Authorization ------------------------------------------------
    const auth = await requirePermissions(request, Permissions.PRODUCT_READ);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // -- Parse Query Parameters ---------------------------------------
    const url = new URL(request.url);
    const queryParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const parsed = listProductsSchema.safeParse(queryParams);
    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      return validationErrorResponse(details);
    }

    const { page, pageSize, search, status, sort } = parsed.data;

    // -- Build filters ------------------------------------------------
    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { productName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = mapApiStatusToPrisma(status);
    }

    // -- Parse sort ---------------------------------------------------
    const orderBy: Record<string, string>[] = [];
    const sortFields = sort.split(",");
    for (const field of sortFields) {
      const trimmed = field.trim();
      if (trimmed.startsWith("-")) {
        orderBy.push({ [mapSortField(trimmed.slice(1))]: "desc" });
      } else if (trimmed.startsWith("+")) {
        orderBy.push({ [mapSortField(trimmed.slice(1))]: "asc" });
      } else {
        orderBy.push({ [mapSortField(trimmed)]: "asc" });
      }
    }

    // -- Execute query ------------------------------------------------
    const skip = (page - 1) * pageSize;

    const [products, totalItems] = await Promise.all([
      prisma.product.findMany({
        where: where as any,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          productName: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.product.count({ where: where as any }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    logger.info("Products listed", {
      ...ctx,
      page,
      pageSize,
      totalItems,
      filters: { search, status },
    });

    return successResponse(products.map(toProductResponse), {
      page,
      pageSize,
      totalItems,
      totalPages,
    });
  } catch (error) {
    logger.error("Product listing failed", ctx, error);
    return internalErrorResponse("Failed to list products");
  }
}

// -- Sort Field Mapping -----------------------------------------------------

/**
 * Maps API sort field names to Prisma field names.
 * API spec uses "name" but Prisma uses "productName".
 */
function mapSortField(field: string): string {
  const fieldMap: Record<string, string> = {
    name: "productName",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    status: "status",
  };
  return fieldMap[field] ?? "createdAt";
}
