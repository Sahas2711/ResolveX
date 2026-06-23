// =============================================================================
// ResolveX — Product Analytics Dashboard API
// GET /api/v1/dashboard/product/{productId} → Product-level complaint analytics
//
// Returns detailed analytics for a specific product:
//   - Total complaint count
//   - Category breakdown
//   - Most frequent issues
//   - SLA violation rate
//   - Resolution trend over time (monthly)
//
// Permission: dashboard:product
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

// -- Types ------------------------------------------------------------------

interface FrequentIssue {
  issue: string;
  count: number;
}

interface TrendPoint {
  period: string;
  count: number;
}

interface ProductMetricsResponse {
  productId: string;
  productName: string;
  totalComplaints: number;
  categoryBreakdown: Record<string, number>;
  frequentIssues: FrequentIssue[];
  slaViolationRate: number | null;
  resolutionTrend: TrendPoint[];
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/v1/dashboard/product/{productId}
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/dashboard/product/{productId}
 *
 * Returns complaint analytics for a specific product. Provides insights
 * into complaint volume, category distribution, trending issues, SLA
 * health, and resolution patterns over time.
 *
 * Permission required: `dashboard:product`
 *
 * Path parameters:
 *   - productId: UUID of the product (required)
 *
 * Query parameters:
 *   - dateFrom: ISO date-time string (optional) — filter complaints created on or after
 *   - dateTo:   ISO date-time string (optional) — filter complaints created on or before
 *
 * Responses:
 *   200 – Product analytics data
 *   403 – Insufficient permissions
 *   404 – Product not found
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const ctx: Record<string, unknown> = {};

  try {
    // -- Authorization ------------------------------------------------
    const auth = await requirePermissions(request, Permissions.DASHBOARD_PRODUCT);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // -- Extract productId --------------------------------------------
    const { productId } = await params;
    ctx.productId = productId;

    // -- Verify product exists and is not deleted ---------------------
    const product = await prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      select: { id: true, productName: true },
    });

    if (!product) {
      return notFoundResponse("Product not found");
    }

    // -- Parse optional date range ------------------------------------
    const url = new URL(request.url);
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");

    const dateFilter: { createdAt?: { gte?: Date; lte?: Date } } = {};
    if (dateFrom) {
      dateFilter.createdAt = { ...dateFilter.createdAt, gte: new Date(dateFrom) };
    }
    if (dateTo) {
      dateFilter.createdAt = { ...dateFilter.createdAt, lte: new Date(dateTo) };
    }

    ctx.dateFrom = dateFrom ?? "none";
    ctx.dateTo = dateTo ?? "none";

    // -- Run all queries in parallel ----------------------------------
    const [
      totalCount,
      categoryData,
      titleGroups,
      slaBreachCount,
      monthlyTrend,
    ] = await Promise.all([
      // 1. Total complaints for this product
      prisma.complaint.count({
        where: { productId, deletedAt: null, ...dateFilter },
      }),

      // 2. Category breakdown — group by category name
      prisma.complaint.groupBy({
        by: ["categoryId"],
        where: { productId, deletedAt: null, ...dateFilter },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),

      // 3. Frequent issues — group by complaint title (category name)
      prisma.complaint.groupBy({
        by: ["title"],
        where: { productId, deletedAt: null, ...dateFilter },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),

      // 4. SLA breach count for this product's complaints
      prisma.slaBreachLog.count({
        where: {
          complaint: {
            productId,
            deletedAt: null,
            ...dateFilter,
          },
        },
      }),

      // 5. Monthly resolution trend — resolved complaints grouped by month
      prisma.complaint.findMany({
        where: {
          productId,
          currentStatus: "RESOLVED",
          resolvedAt: { not: null },
          deletedAt: null,
          ...dateFilter,
        },
        select: { resolvedAt: true },
        orderBy: { resolvedAt: "asc" },
      }),
    ]);

    // -- Build category name map --------------------------------------
    const categoryIds = categoryData.map((c) => c.categoryId).filter(Boolean) as string[];
    const categories = categoryIds.length > 0
      ? await prisma.complaintCategory.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true },
        })
      : [];

    const categoryNameMap = new Map(categories.map((c) => [c.id, c.name]));

    const categoryBreakdown = Object.fromEntries(
      categoryData.map((c) => [
        categoryNameMap.get(c.categoryId) ?? "Unknown",
        c._count.id,
      ]),
    ) as Record<string, number>;

    // -- Build frequent issues ----------------------------------------
    const frequentIssues: FrequentIssue[] = titleGroups.map((t) => ({
      issue: t.title,
      count: t._count.id,
    }));

    // -- Compute SLA violation rate -----------------------------------
    const slaViolationRate =
      totalCount > 0
        ? Math.round((slaBreachCount / totalCount) * 100)
        : null;

    // -- Build monthly resolution trend ------------------------------
    // Group resolved complaints by year-month
    const trendMap = new Map<string, number>();
    for (const c of monthlyTrend) {
      if (c.resolvedAt) {
        const key = `${c.resolvedAt.getFullYear()}-${String(c.resolvedAt.getMonth() + 1).padStart(2, "0")}`;
        trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
      }
    }

    const resolutionTrend: TrendPoint[] = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, count]) => ({ period, count }));

    const response: ProductMetricsResponse = {
      productId,
      productName: product.productName,
      totalComplaints: totalCount,
      categoryBreakdown,
      frequentIssues,
      slaViolationRate,
      resolutionTrend,
    };

    logger.info("Product analytics fetched", {
      ...ctx,
      productName: product.productName,
      totalComplaints: totalCount,
      categoryCount: Object.keys(categoryBreakdown).length,
      trendPoints: resolutionTrend.length,
    });

    return successResponse(response);
  } catch (error) {
    logger.error("Product analytics fetch failed", ctx, error);
    return internalErrorResponse("Failed to load product analytics");
  }
}
