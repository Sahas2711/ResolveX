// =============================================================================
// ResolveX — Dashboard Overview API
// GET /api/v1/dashboard/overview → System-wide KPI summary
//
// Returns aggregate KPIs across the entire platform:
//   - Total, open, resolved, and closed complaint counts
//   - SLA breach count
//   - Average resolution time (hours)
//   - Resolution rate (%)
//
// Permission: dashboard:executive
// =============================================================================

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/permissions";
import { requirePermissions } from "@/lib/rbac";
import { successResponse, internalErrorResponse } from "@/lib/response";

// -- Types ------------------------------------------------------------------

interface DashboardOverviewResponse {
  totalComplaints: number;
  openComplaints: number;
  resolvedComplaints: number;
  closedComplaints: number;
  slaBreaches: number;
  averageResolutionTimeHours: number | null;
  resolutionRate: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/v1/dashboard/overview
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/dashboard/overview
 *
 * Returns system-wide KPI summary for executives.
 * Supports optional date range filtering via `dateFrom` and `dateTo` query params.
 *
 * Permission required: `dashboard:executive`
 *
 * Query parameters:
 *   - dateFrom: ISO date-time string (optional) — filter complaints created on or after
 *   - dateTo:   ISO date-time string (optional) — filter complaints created on or before
 *
 * Responses:
 *   200 – KPI data
 *   403 – Insufficient permissions
 */
export async function GET(request: Request) {
  const ctx: Record<string, unknown> = {};

  try {
    // -- Authorization ------------------------------------------------
    const auth = await requirePermissions(request, Permissions.DASHBOARD_EXECUTIVE);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

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
      statusCounts,
      slaBreachCount,
      resolvedComplaintData,
    ] = await Promise.all([
      // 1. Total complaints (non-deleted)
      prisma.complaint.count({ where: { deletedAt: null, ...dateFilter } }),

      // 2. Status breakdown (for open, resolved, closed)
      prisma.complaint.groupBy({
        by: ["currentStatus"],
        where: { deletedAt: null, ...dateFilter },
        _count: { id: true },
      }),

      // 3. SLA breaches (count of all SLA breach events)
      prisma.slaBreachLog.count({
        where: {
          complaint: { deletedAt: null, ...dateFilter },
        },
      }),

      // 4. Resolved complaints with timestamps for avg resolution time
      prisma.complaint.findMany({
        where: {
          currentStatus: "RESOLVED",
          resolvedAt: { not: null },
          deletedAt: null,
          ...dateFilter,
        },
        select: { createdAt: true, resolvedAt: true },
      }),
    ]);

    // -- Build status map ---------------------------------------------
    const statusMap = new Map<string, number>();
    for (const s of statusCounts) {
      statusMap.set(s.currentStatus, s._count.id);
    }

    const openComplaints = (statusMap.get("OPEN") ?? 0)
      + (statusMap.get("ASSIGNED") ?? 0)
      + (statusMap.get("IN_PROGRESS") ?? 0)
      + (statusMap.get("WAITING_CUSTOMER") ?? 0)
      + (statusMap.get("REOPENED") ?? 0)
      + (statusMap.get("ESCALATED") ?? 0);

    const resolvedCount = statusMap.get("RESOLVED") ?? 0;
    const closedComplaints = statusMap.get("CLOSED") ?? 0;

    // -- Average resolution time (hours) ------------------------------
    const totalResolutionMs = resolvedComplaintData.reduce(
      (sum, c) => {
        if (c.resolvedAt) return sum + (c.resolvedAt.getTime() - c.createdAt.getTime());
        return sum;
      },
      0,
    );
    const avgResolutionTimeHours =
      resolvedComplaintData.length > 0
        ? totalResolutionMs / resolvedComplaintData.length / (1000 * 60 * 60)
        : null;

    // -- Resolution rate (% of resolved + closed vs total) ------------
    const resolutionRate =
      totalCount > 0
        ? Math.round(((resolvedCount + closedComplaints) / totalCount) * 100)
        : null;

    const response: DashboardOverviewResponse = {
      totalComplaints: totalCount,
      openComplaints,
      resolvedComplaints: resolvedCount,
      closedComplaints,
      slaBreaches: slaBreachCount,
      averageResolutionTimeHours: avgResolutionTimeHours !== null
        ? Math.round(avgResolutionTimeHours * 100) / 100
        : null,
      resolutionRate,
    };

    logger.info("Dashboard overview fetched", {
      ...ctx,
      totalComplaints: totalCount,
      resolutionRate,
    });

    return successResponse(response);
  } catch (error) {
    logger.error("Dashboard overview fetch failed", ctx, error);
    return internalErrorResponse("Failed to load dashboard overview");
  }
}
