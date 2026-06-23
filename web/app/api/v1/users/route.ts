// =============================================================================
// ResolveX — Users API
// GET  /api/v1/users  → List/search users with pagination (admin)
// =============================================================================

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/permissions";
import { requirePermissions } from "@/lib/rbac";
import {
  successResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";
import {
  listUsersSchema,
  toUserResponse,
} from "@/lib/validators/user";

// -- GET: List Users --------------------------------------------------------

/**
 * GET /api/v1/users
 *
 * Lists users with search, status filter, and pagination.
 * Requires `user:read` permission (admin only).
 *
 * Query parameters:
 *   - page:     integer (1-based, default 1)
 *   - pageSize: integer (1–100, default 20)
 *   - search:   string  (matches against firstName, lastName, email, employeeId)
 *   - status:   "active" | "inactive" | "suspended"
 *   - sort:     sort field(s) prefixed with +/- (default "-createdAt")
 */
export async function GET(request: Request) {
  const ctx: Record<string, unknown> = {};

  try {
    const auth = await requirePermissions(request, Permissions.USER_READ);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    const url = new URL(request.url);
    const queryParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const parsed = listUsersSchema.safeParse(queryParams);
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
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { employeeId: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      const statusMap: Record<string, string> = {
        active: "ACTIVE",
        inactive: "INACTIVE",
        suspended: "SUSPENDED",
      };
      where.status = statusMap[status] ?? "ACTIVE";
      if (status === "inactive") {
        where.isActive = false;
      }
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

    const [users, totalItems] = await Promise.all([
      prisma.user.findMany({
        where: where as any,
        orderBy,
        skip,
        take: pageSize,
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
          updatedAt: true,
          userRoles: {
            select: {
              role: { select: { name: true } },
            },
          },
        },
      }),
      prisma.user.count({ where: where as any }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    logger.info("Users listed", {
      ...ctx,
      page,
      pageSize,
      totalItems,
      filters: { search, status },
    });

    return successResponse(users.map(toUserResponse), {
      page,
      pageSize,
      totalItems,
      totalPages,
    });
  } catch (error) {
    logger.error("User listing failed", ctx, error);
    return internalErrorResponse("Failed to list users");
  }
}

// -- Sort Field Mapping -----------------------------------------------------

function mapSortField(field: string): string {
  const fieldMap: Record<string, string> = {
    name: "firstName",
    email: "email",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    status: "status",
  };
  return fieldMap[field] ?? "createdAt";
}
