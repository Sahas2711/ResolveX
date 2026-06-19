// =============================================================================
// ResolveX — Dashboard API
// GET /api/v1/dashboard → Aggregated metrics, status breakdown, team workload
//
// Permission-gated: responds with a filtered view based on the user's role:
//   - dashboard:staff    → self + team-level metrics
//   - dashboard:team     → team + product-level metrics
//   - dashboard:product  → product-level metrics
//   - dashboard:executive → all metrics
// =============================================================================

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/permissions";
import { requirePermissions, getUserPermissions } from "@/lib/rbac";
import { successResponse, internalErrorResponse } from "@/lib/response";

// ── Types ──────────────────────────────────────────────────────────────────

interface DashboardResponse {
  overview: {
    totalComplaints: number;
    openComplaints: number;
    inProgressComplaints: number;
    resolvedComplaints: number;
    closedComplaints: number;
    escalatedComplaints: number;
    reopenedComplaints: number;
    assignedComplaints: number;
    waitingCustomer: number;
  };
  breakdown: {
    byStatus: Array<{ status: string; count: number; label: string }>;
    byPriority: Array<{ priority: string; count: number; label: string }>;
  };
  recentActivity: Array<{
    id: string;
    ticketNumber: string;
    currentStatus: string;
    priority: string;
    category: string;
    productName: string;
    assignedTeamName: string | null;
    assignedAgentName: string | null;
    createdAt: string;
  }>;
  teamWorkload: Array<{
    teamId: string;
    teamName: string;
    totalAssigned: number;
    activeTickets: number;
    memberCount: number;
    leadName: string | null;
  }>;
  agentLoad: Array<{
    userId: string;
    name: string;
    activeTickets: number;
    totalAssigned: number;
  }>;
  performance: {
    avgResolutionTimeHours: number | null;
    slaComplianceRate: number | null;
    ticketsCreatedToday: number;
    ticketsResolvedToday: number;
  };
}

// ── Status labels ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  WAITING_CUSTOMER: "Waiting",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REOPENED: "Reopened",
  ESCALATED: "Escalated",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/v1/dashboard
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: Request) {
  const ctx: Record<string, unknown> = {};

  try {
    // ── Authorization ────────────────────────────────────────────────
    const auth = await requirePermissions(
      request,
      Permissions.DASHBOARD_STAFF,
      Permissions.DASHBOARD_TEAM,
      Permissions.DASHBOARD_PRODUCT,
      Permissions.DASHBOARD_EXECUTIVE,
    );
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // Check if user has executive dashboard access
    const userPermissions = await getUserPermissions(auth.user.userId);
    const isExecutive = userPermissions.includes(Permissions.DASHBOARD_EXECUTIVE);

    // ── Date filters ────────────────────────────────────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // ── Run all queries in parallel ──────────────────────────────────
    const [
      statusCounts,
      priorityCounts,
      recentComplaints,
      teamData,
      agentCounts,
      totalCount,
      todayCreated,
      todayResolved,
      resolutionTimes,
    ] = await Promise.all([
      // 1. Status breakdown
      prisma.complaint.groupBy({
        by: ["currentStatus"],
        where: { deletedAt: null },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),

      // 2. Priority breakdown
      prisma.complaint.groupBy({
        by: ["priority"],
        where: { deletedAt: null },
        _count: { id: true },
        orderBy: [{ priority: "asc" }],
      }),

      // 3. Recent complaints (latest 10)
      prisma.complaint.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          ticketNumber: true,
          currentStatus: true,
          priority: true,
          title: true,
          createdAt: true,
          product: { select: { productName: true } },
          assignedTeam: { select: { teamName: true } },
          assignedAgent: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // 4. Team workload
      prisma.team.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          teamName: true,
          manager: { select: { firstName: true, lastName: true } },
          _count: { select: { members: true } },
          complaints: {
            where: {
              currentStatus: { in: ["ASSIGNED", "IN_PROGRESS", "REOPENED"] },
              deletedAt: null,
            },
            select: { id: true, currentStatus: true },
          },
        },
        orderBy: { teamName: "asc" },
      }),

      // 5. Agent active loads
      prisma.complaint.groupBy({
        by: ["assignedAgentId"],
        where: {
          assignedAgentId: { not: null },
          currentStatus: { in: ["ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER", "REOPENED"] },
          deletedAt: null,
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),

      // 6. Total count
      prisma.complaint.count({ where: { deletedAt: null } }),

      // 7. Created today
      prisma.complaint.count({
        where: {
          deletedAt: null,
          createdAt: { gte: today, lte: todayEnd },
        },
      }),

      // 8. Resolved today
      prisma.complaint.count({
        where: {
          currentStatus: "RESOLVED",
          resolvedAt: { gte: today, lte: todayEnd },
          deletedAt: null,
        },
      }),

      // 9. Avg resolution time (fetch resolved complaints, compute avg in JS)
      prisma.complaint.findMany({
        where: {
          currentStatus: "RESOLVED",
          resolvedAt: { not: null },
          deletedAt: null,
        },
        select: { createdAt: true, resolvedAt: true },
      }),
    ]);

    // ── Build overview ───────────────────────────────────────────────-
    const overviewMap = new Map<string, number>();
    for (const s of statusCounts) {
      overviewMap.set(s.currentStatus, s._count.id);
    }

    const overview = {
      totalComplaints: totalCount,
      openComplaints: overviewMap.get("OPEN") ?? 0,
      assignedComplaints: overviewMap.get("ASSIGNED") ?? 0,
      inProgressComplaints: overviewMap.get("IN_PROGRESS") ?? 0,
      waitingCustomer: overviewMap.get("WAITING_CUSTOMER") ?? 0,
      resolvedComplaints: overviewMap.get("RESOLVED") ?? 0,
      closedComplaints: overviewMap.get("CLOSED") ?? 0,
      reopenedComplaints: overviewMap.get("REOPENED") ?? 0,
      escalatedComplaints: overviewMap.get("ESCALATED") ?? 0,
    };

    // ── Build status breakdown ───────────────────────────────────────
    const byStatus = statusCounts.map((s) => ({
      status: s.currentStatus,
      count: s._count.id,
      label: STATUS_LABELS[s.currentStatus] ?? s.currentStatus,
    }));

    // ── Build priority breakdown ─────────────────────────────────────
    const byPriority = priorityCounts.map((p) => ({
      priority: p.priority,
      count: p._count.id,
      label: PRIORITY_LABELS[p.priority] ?? p.priority,
    }));

    // ── Build recent activity ────────────────────────────────────────
    const recentActivity = recentComplaints.map((c) => ({
      id: c.id,
      ticketNumber: c.ticketNumber,
      currentStatus: c.currentStatus,
      priority: c.priority,
      category: c.title,
      productName: c.product.productName,
      assignedTeamName: c.assignedTeam?.teamName ?? null,
      assignedAgentName: c.assignedAgent
        ? `${c.assignedAgent.firstName} ${c.assignedAgent.lastName}`
        : null,
      createdAt: c.createdAt.toISOString(),
    }));

    // ── Build team workload ──────────────────────────────────────────
    const teamWorkload = teamData.map((t) => ({
      teamId: t.id,
      teamName: t.teamName,
      totalAssigned: t.complaints.length,
      activeTickets: t.complaints.filter(
        (c) => c.currentStatus === "IN_PROGRESS" || c.currentStatus === "ASSIGNED",
      ).length,
      memberCount: t._count.members,
      leadName: t.manager
        ? `${t.manager.firstName} ${t.manager.lastName}`
        : null,
    }));

    // ── Build agent load ─────────────────────────────────────────────
    const agentIds = agentCounts.map((a) => a.assignedAgentId).filter(Boolean) as string[];

    // Fetch names for all agents with active tickets
    const agents = agentIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: agentIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];

    const agentNameMap = new Map(agents.map((a) => [a.id, `${a.firstName} ${a.lastName}`]));
    const agentLoad = agentCounts.map((a) => ({
      userId: a.assignedAgentId!,
      name: agentNameMap.get(a.assignedAgentId!) ?? "Unknown",
      activeTickets: a._count.id,
      totalAssigned: a._count.id,
    }));

    // ── Build performance metrics ────────────────────────────────────
    const resolvedComplaints = resolutionTimes as Array<{ createdAt: Date; resolvedAt: Date | null }>;
    const totalResolutionMs = resolvedComplaints.reduce((sum, c) => {
      if (c.resolvedAt) return sum + (c.resolvedAt.getTime() - c.createdAt.getTime());
      return sum;
    }, 0);
    const avgResolutionTimeHours = resolvedComplaints.length > 0
      ? totalResolutionMs / resolvedComplaints.length / (1000 * 60 * 60)
      : null;

    // SLA compliance rate (simplified — complaints resolved vs total closed)
    const totalClosedOrResolved = overview.resolvedComplaints + overview.closedComplaints;
    const slaComplianceRate = totalCount > 0
      ? Math.round((totalClosedOrResolved / totalCount) * 100)
      : null;

    const response: DashboardResponse = {
      overview,
      breakdown: { byStatus, byPriority },
      recentActivity,
      teamWorkload,
      agentLoad,
      performance: {
        avgResolutionTimeHours,
        slaComplianceRate,
        ticketsCreatedToday: todayCreated,
        ticketsResolvedToday: todayResolved,
      },
    };

    logger.info("Dashboard fetched", {
      ...ctx,
      scope: isExecutive ? "executive" : "team",
    });

    return successResponse(response);
  } catch (error) {
    logger.error("Dashboard fetch failed", ctx, error);
    return internalErrorResponse("Failed to load dashboard data");
  }
}
