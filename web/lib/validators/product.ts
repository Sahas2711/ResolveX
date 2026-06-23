// =============================================================================
// Product Validators
// Matches the API-Specifications.yaml Product schemas
// =============================================================================

import { z } from "zod";

// -- Product Status ---------------------------------------------------------
// API spec: "status" is enum [active, inactive]
// Prisma:    ProductStatus = ACTIVE | DEPRECATED | DISABLED
// Mapping:   active → ACTIVE, inactive → DISABLED
export const ApiProductStatus = z.enum(["active", "inactive"]);
export type ApiProductStatus = z.infer<typeof ApiProductStatus>;

export function mapApiStatusToPrisma(
  status: ApiProductStatus
): "ACTIVE" | "DISABLED" {
  return status === "active" ? "ACTIVE" : "DISABLED";
}

export function mapPrismaStatusToApi(
  status: string
): ApiProductStatus {
  return status === "ACTIVE" ? "active" : "inactive";
}

// -- Create Product Schema --------------------------------------------------
// API spec: ProductCreateRequest { name, description?, status? }
export const createProductSchema = z.object({
  name: z
    .string()
    .min(1, "Product name is required")
    .max(100, "Product name must be at most 100 characters")
    .trim(),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .trim()
    .optional()
    .default(""),
  status: ApiProductStatus.optional().default("active"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

// -- Update Product Schema --------------------------------------------------
// API spec: ProductUpdateRequest { name?, description?, status? }
// (Will be used in Phase 2 – Update & Delete)
export const updateProductSchema = z.object({
  name: z
    .string()
    .min(1, "Product name is required")
    .max(100, "Product name must be at most 100 characters")
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .trim()
    .optional(),
  status: ApiProductStatus.optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// -- Query / List Schema ----------------------------------------------------
export const listProductsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  status: ApiProductStatus.optional(),
  sort: z.string().optional().default("-createdAt"),
});

export type ListProductsInput = z.infer<typeof listProductsSchema>;

// -- Product Response Shape (matches API spec) ------------------------------
export interface ProductResponse {
  id: string;
  name: string;
  description: string | null;
  status: ApiProductStatus;
  createdAt: string;
  updatedAt: string;
}

// -- Helper: Map a Prisma Product row to the API response shape ------------

export interface ProductSelectShape {
  id: string;
  productName: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toProductResponse(product: ProductSelectShape): ProductResponse {
  return {
    id: product.id,
    name: product.productName,
    description: product.description,
    status: mapPrismaStatusToApi(product.status),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
