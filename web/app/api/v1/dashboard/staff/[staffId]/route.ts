// =============================================================================
// ResolveX — Staff Metrics Dashboard API
// GET /api/v1/dashboard/staff/{staffId} → Individual staff performance metrics
//
// Returns detailed performance KPIs for a specific staff member:
//   - Total assigned, completed, pending, reopened, and escalated counts
//   - Average resolution time (hours)
//   - Average first response time (minutes)
//   - Productivity score
//
// Permission: dashboard:staff
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

// ── Types ──────────────────────────────────────────────────────────────────

interface StaffMetricsResponse {
  staffId: string;
  staffName: string;
  totalAssigned: number;
  completed: number;
  pending: number;
  reopened: number;
  escalated: number;
  avgResolutionTimeHours: number | null;
  avgFirstResponseTimeMinutes: number | null;
  productivityScore: number | null;
}

const ACTIVE_STATUSES = ["ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER"];

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/v1/dashboard/staff/{staffId}
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/dashboard/staff/{staffId}
 *
 * Returns detailed performance metrics for a specific staff member.
 * Calculates real-time KPIs from the complaint and assignment data.
 *
 * Permission required: `dashboard:staff`
 *
 * Path parameters:
 *   - staffId: UUID of the staff member (required)
 *
 * Query parameters:
 *   - dateFrom: ISO date-time string (optional) — filter complaints created on or after
 *   - dateTo:   ISO date-time string (optional) — filter complaints created on or before
 *
 * Responses:
 *   200 – Staff metrics data
 *   403 – Insufficient permissions
 *   404 – Staff member not found
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ staffId: string }> },
) {
  const ctx: Record<string, unknown> = {};

  try {
    // ── Authorization ────────────────────────────────────────────────
    const auth = await requirePermissions(request, Permissions.DASHBOARD_STAFF);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // ── Extract staffId ──────────────────────────────────────────────
    const { staffId } = await params;
    ctx.staffId = staffId;

    // ── Verify staff exists and is active ────────────────────────────
    const staff = await prisma.user.findFirst({
      where: {
        id: staffId,
        isActive: true,
        status: "ACTIVE",
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!staff) {
      return notFoundResponse("Staff member not found or is inactive");
    }

    const staffName = `${staff.firstName} ${staff.lastName}`;

    // ── Parse optional date range ────────────────────────────────────
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

    // ── Run all queries in parallel ──────────────────────────────────
    const [
      statusCounts,
      resolvedComplaints,
      firstResponseData,
      activeComplaintsCount,
    ] = await Promise.all([
      // 1. Status breakdown for this agent's complaints
      prisma.complaint.groupBy({
        by: ["currentStatus"],
        where: {
          assignedAgentId: staffId,
          deletedAt: null,
          ...dateFilter,
        },
        _count: { id: true },
      }),

      // 2. Resolved complaints with timestamps for avg resolution time
      prisma.complaint.findMany({
        where: {
          assignedAgentId: staffId,
          currentStatus: "RESOLVED",
          resolvedAt: { not: null },
          deletedAt: null,
          ...dateFilter,
        },
        select: { createdAt: true, resolvedAt: true },
        orderBy: { createdAt: "desc" },
      }),

      // 3. First response time — earliest comment on each complaint
      //    Fetch complaints with at least one comment, ordered by earliest comment
      prisma.complaint.findMany({
        where: {
          assignedAgentId: staffId,
          deletedAt: null,
          ...dateFilter,
          comments: { some: {} },
        },
        select: {
          id: true,
          createdAt: true,
          comments: {
            select: { createdAt: true },
            orderBy: { createdAt: "asc" as const },
            take: 1,
          },
        },
      }),

      // 4. Active complaints count (for productivity weighting)
      prisma.complaint.count({
        where: {
          assignedAgentId: staffId,
          currentStatus: { in: ["ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER"] },
          deletedAt: null,
          ...dateFilter,
        },
      }),
    ]);

    // ── Build status map ─────────────────────────────────────────────
    const statusMap = new Map<string, number>();
    for (const s of statusCounts) {
      statusMap.set(s.currentStatus, s._count.id);
    }

    const totalAssigned = statusCounts.reduce((sum, s) => sum + s._count.id, 0);
    const completed = (statusMap.get("RESOLVED") ?? 0) + (statusMap.get("CLOSED") ?? 0);
    const pending = ACTIVE_STATUSES.reduce((sum, s) => sum + (statusMap.get(s) ?? 0), 0);
    const reopened = statusMap.get("REOPENED") ?? 0;
    const escalated = statusMap.get("ESCALATED") ?? 0;

    // ── Average resolution time (hours) ──────────────────────────────
    const totalResolutionMs = resolvedComplaints.reduce(
      (sum, c) => {
        if (c.resolvedAt) return sum + (c.resolvedAt.getTime() - c.createdAt.getTime());
        return sum;
      },
      0,
    );
    const avgResolutionTimeHours =
      resolvedComplaints.length > 0
        ? Math.round((totalResolutionMs / resolvedComplaints.length / (1000 * 60 * 60)) * 100) / 100
        : null;

    // ── Average first response time (minutes) ────────────────────────
    const firstResponseTimes = firstResponseData
      .filter((c) => c.comments.length > 0)
      .map((c) => c.comments[0].createdAt.getTime() - c.createdAt.getTime());

    const avgFirstResponseTimeMinutes =
      firstResponseTimes.length > 0
        ? Math.round(
            (firstResponseTimes.reduce((sum, t) => sum + t, 0) /
              firstResponseTimes.length /
              (1000 * 60)) *
              100,
          ) / 100
        : null;

    // ── Productivity score (0–100) ───────────────────────────────────
    // Weighted formula: completion ratio adjusted for active workload
    // Base: percentage of complaints that reached RESOLVED or CLOSED
    // Adjusted: lower weight if many complaints are still active
    let productivityScore: number | null = null;
    if (totalAssigned > 0) {
      const completionRatio = completed / totalAssigned;
      const activeRatio = totalAssigned > 0 ? activeComplaintsCount / totalAssigned : 0;
      // Score: completion ratio weighted against active load
      // Higher completion + lower active load = higher score
      productivityScore = Math.round(
        Math.max(0, Math.min(100, (completionRatio * 0.7 + (1 - activeRatio) * 0.3) * 100)),
      );
    }

    const response: StaffMetricsResponse = {
      staffId,
      staffName,
      totalAssigned,
      completed,
      pending,
      reopened,
      escalated,
      avgResolutionTimeHours,
      avgFirstResponseTimeMinutes,
      productivityScore,
    };

    logger.info("Staff metrics fetched", {
      ...ctx,
      staffName,
      totalAssigned,
      completed,
      productivityScore,
    });

    return successResponse(response);
  } catch (error) {
    logger.error("Staff metrics fetch failed", ctx, error);
    return internalErrorResponse("Failed to load staff metrics");
  }
}
