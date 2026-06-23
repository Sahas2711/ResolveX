// =============================================================================
// ResolveX — Team Metrics Dashboard API
// GET /api/v1/dashboard/team/{teamId} → Team-level performance metrics
//
// Returns aggregate KPIs for a specific support team:
//   - Workload (total open complaints)
//   - Backlog (open complaints older than 30 days)
//   - Resolution rate (%)
//   - SLA compliance rate (%)
//   - Average resolution time (hours)
//
// Permission: dashboard:team
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

interface TeamMetricsResponse {
  teamId: string;
  teamName: string;
  workload: number;
  backlog: number;
  resolutionRate: number | null;
  slaCompliance: number | null;
  avgResolutionTimeHours: number | null;
}

const OPEN_STATUSES = [
  "OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER",
  "REOPENED", "ESCALATED",
];

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/v1/dashboard/team/{teamId}
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/dashboard/team/{teamId}
 *
 * Returns performance metrics for a specific support team. All KPIs are
 * computed in real-time from complaint data assigned to the team.
 *
 * Permission required: `dashboard:team`
 *
 * Path parameters:
 *   - teamId: UUID of the team (required)
 *
 * Query parameters:
 *   - dateFrom: ISO date-time string (optional) — filter complaints created on or after
 *   - dateTo:   ISO date-time string (optional) — filter complaints created on or before
 *
 * Responses:
 *   200 – Team metrics data
 *   403 – Insufficient permissions
 *   404 – Team not found
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const ctx: Record<string, unknown> = {};

  try {
    // -- Authorization ------------------------------------------------
    const auth = await requirePermissions(request, Permissions.DASHBOARD_TEAM);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // -- Extract teamId -----------------------------------------------
    const { teamId } = await params;
    ctx.teamId = teamId;

    // -- Verify team exists and is not deleted ------------------------
    const team = await prisma.team.findFirst({
      where: { id: teamId, deletedAt: null },
      select: { id: true, teamName: true },
    });

    if (!team) {
      return notFoundResponse("Team not found");
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

    // -- 30-day cutoff for backlog ------------------------------------
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // -- Run all queries in parallel ----------------------------------
    const [
      statusCounts,
      backlogCount,
      resolvedComplaints,
      slaBreachCount,
      totalComplaints,
    ] = await Promise.all([
      // 1. Status breakdown for this team's complaints
      prisma.complaint.groupBy({
        by: ["currentStatus"],
        where: {
          assignedTeamId: teamId,
          deletedAt: null,
          ...dateFilter,
        },
        _count: { id: true },
      }),

      // 2. Backlog: open complaints older than 30 days
      prisma.complaint.count({
        where: {
          assignedTeamId: teamId,
          currentStatus: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER", "REOPENED", "ESCALATED"] },
          createdAt: { lt: thirtyDaysAgo, ...(dateFilter.createdAt ?? {}) },
          deletedAt: null,
        },
      }),

      // 3. Resolved complaints with timestamps for avg resolution time
      prisma.complaint.findMany({
        where: {
          assignedTeamId: teamId,
          currentStatus: "RESOLVED",
          resolvedAt: { not: null },
          deletedAt: null,
          ...dateFilter,
        },
        select: { createdAt: true, resolvedAt: true },
      }),

      // 4. SLA tracking data for SLA compliance calculation
      //    Count complaints with SLA tracking records that were NOT breached
      prisma.slaBreachLog.count({
        where: {
          complaint: {
            assignedTeamId: teamId,
            deletedAt: null,
            ...dateFilter,
          },
        },
      }),

      // 5. Total complaints ever assigned to the team
      prisma.complaint.count({
        where: {
          assignedTeamId: teamId,
          deletedAt: null,
          ...dateFilter,
        },
      }),
    ]);

    // -- Build status map ---------------------------------------------
    const statusMap = new Map<string, number>();
    for (const s of statusCounts) {
      statusMap.set(s.currentStatus, s._count.id);
    }

    // -- Compute workload ---------------------------------------------
    const workload = OPEN_STATUSES.reduce(
      (sum, s) => sum + (statusMap.get(s) ?? 0),
      0,
    );

    // -- Compute resolution rate --------------------------------------
    const resolvedCount = statusMap.get("RESOLVED") ?? 0;
    const closedCount = statusMap.get("CLOSED") ?? 0;
    const terminalCount = resolvedCount + closedCount;

    const resolutionRate =
      totalComplaints > 0
        ? Math.round((terminalCount / totalComplaints) * 100)
        : null;

    // -- Compute average resolution time (hours) ----------------------
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

    // -- Compute SLA compliance rate ----------------------------------
    // SLA compliance = 1 - (breached / total) as percentage
    // Higher is better. 100% means no SLA breaches.
    const slaCompliance =
      totalComplaints > 0
        ? Math.round(((totalComplaints - slaBreachCount) / totalComplaints) * 100)
        : null;

    const response: TeamMetricsResponse = {
      teamId,
      teamName: team.teamName,
      workload,
      backlog: backlogCount,
      resolutionRate,
      slaCompliance,
      avgResolutionTimeHours,
    };

    logger.info("Team metrics fetched", {
      ...ctx,
      teamName: team.teamName,
      workload,
      backlog: backlogCount,
      resolutionRate,
      slaCompliance,
    });

    return successResponse(response);
  } catch (error) {
    logger.error("Team metrics fetch failed", ctx, error);
    return internalErrorResponse("Failed to load team metrics");
  }
}
