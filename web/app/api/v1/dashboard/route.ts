// =============================================================================
// ResolveX — Dashboard API
// GET /api/v1/dashboard → User-specific aggregated metrics
//
// Filters data based on the logged-in user's role:
//   - dashboard:staff (SUPPORT_AGENT)
//       → Only complaints assigned to the user
//       → Only teams the user belongs to
//       → Only the user's own agent load
//   - dashboard:team (TEAM_LEAD)
//       → Complaints assigned to the user's teams
//       → Only teams the user leads / belongs to
//       → Agents within those teams
//   - dashboard:product (PRODUCT_MANAGER)
//       → Product-level metrics
//   - dashboard:executive (ADMIN)
//       → All metrics (unfiltered)
// =============================================================================

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Permissions, type PermissionKey } from "@/lib/permissions";
import { getUserFromRequest, getUserPermissions } from "@/lib/rbac";
import { successResponse, forbiddenResponse, internalErrorResponse } from "@/lib/response";

// -- Types ------------------------------------------------------------------

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

// -- Status labels ----------------------------------------------------------

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

// -- Helper: Build complaint where filter based on user scope ---------------

async function buildComplaintFilter(
  userId: string,
  permissions: string[],
): Promise<Record<string, unknown>> {
  const isExecutive = permissions.includes(Permissions.DASHBOARD_EXECUTIVE);
  const hasTeamAccess = permissions.includes(Permissions.DASHBOARD_TEAM);
  const hasStaffAccess = permissions.includes(Permissions.DASHBOARD_STAFF);

  const filter: Record<string, unknown> = { deletedAt: null };

  if (isExecutive) {
    // Executive sees everything
    return filter;
  }

  if (hasTeamAccess) {
    // Team lead: see complaints assigned to teams the user belongs to
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });
    const teamIds = memberships.map((m) => m.teamId);
    if (teamIds.length > 0) {
      filter.OR = [
        { assignedTeamId: { in: teamIds } },
        { assignedAgentId: userId },
      ];
    } else {
      filter.assignedAgentId = userId;
    }
    return filter;
  }

  if (hasStaffAccess) {
    // Staff: only see complaints assigned to them
    filter.assignedAgentId = userId;
    return filter;
  }

  // Product manager or other — show nothing
  filter.id = "00000000-0000-0000-0000-000000000000";
  return filter;
}

// -- Helper: Get team IDs the user belongs to ------------------------------

async function getUserTeamIds(userId: string): Promise<string[]> {
  const [memberships, managedTeams] = await Promise.all([
    prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    }),
    prisma.team.findMany({
      where: { managerId: userId, deletedAt: null },
      select: { id: true },
    }),
  ]);
  return [...new Set([
    ...memberships.map((m) => m.teamId),
    ...managedTeams.map((t) => t.id),
  ])];
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/v1/dashboard
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: Request) {
  const ctx: Record<string, unknown> = {};

  try {
    // -- Authorization ------------------------------------------------
    // NOTE: requirePermissions uses AND logic (all perms must match).
    // The dashboard uses OR logic — any one dashboard permission is sufficient.
    // So we fetch permissions manually and do the OR check ourselves.
    const user = getUserFromRequest(request);
    if (!user) {
      return forbiddenResponse("Authentication required");
    }
    const userId = user.userId;
    ctx.userId = userId;

    const userPermissions = await getUserPermissions(userId);
    const dashboardPerms = new Set<PermissionKey>([
      Permissions.DASHBOARD_STAFF,
      Permissions.DASHBOARD_TEAM,
      Permissions.DASHBOARD_PRODUCT,
      Permissions.DASHBOARD_EXECUTIVE,
    ]);
    const hasDashboardAccess = userPermissions.some((p) => dashboardPerms.has(p));
    if (!hasDashboardAccess) {
      return forbiddenResponse("Insufficient permissions");
    }

    const isExecutive = userPermissions.includes(Permissions.DASHBOARD_EXECUTIVE);
    const isTeamLead = userPermissions.includes(Permissions.DASHBOARD_TEAM);
    const isStaff = userPermissions.includes(Permissions.DASHBOARD_STAFF);

    // Build complaint filter based on user scope
    const complaintFilter = await buildComplaintFilter(userId, userPermissions);

    // Get user's team IDs (for team/agent filtering)
    const userTeamIds = isExecutive ? [] : await getUserTeamIds(userId);
    const activeStatuses = ["ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER", "REOPENED"];

    // -- Date filters ------------------------------------------------
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // -- Run all queries in parallel ----------------------------------
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
      // 1. Status breakdown (scoped to user)
      prisma.complaint.groupBy({
        by: ["currentStatus"],
        where: complaintFilter as any,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),

      // 2. Priority breakdown (scoped to user)
      prisma.complaint.groupBy({
        by: ["priority"],
        where: complaintFilter as any,
        _count: { id: true },
        orderBy: [{ priority: "asc" }],
      }),

      // 3. Recent complaints — latest 10 (scoped to user)
      prisma.complaint.findMany({
        where: complaintFilter as any,
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

      // 4. Team workload (scoped to user's teams)
      prisma.team.findMany({
        where: {
          deletedAt: null,
          ...(isExecutive ? {} : { id: { in: userTeamIds } }),
        },
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

      // 5. Agent active loads (scoped to user's teams)
      prisma.complaint.groupBy({
        by: ["assignedAgentId"],
        where: {
          assignedAgentId: { not: null },
          currentStatus: { in: activeStatuses },
          deletedAt: null,
          ...(isExecutive
            ? {}
            : {
                OR: [
                  { assignedTeamId: { in: userTeamIds } },
                  { assignedAgentId: userId },
                ],
              }),
        } as any,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),

      // 6. Total count (scoped to user)
      prisma.complaint.count({ where: complaintFilter as any }),

      // 7. Created today (scoped to user)
      prisma.complaint.count({
        where: {
          ...complaintFilter,
          createdAt: { gte: today, lte: todayEnd },
        } as any,
      }),

      // 8. Resolved today (scoped to user)
      prisma.complaint.count({
        where: {
          ...complaintFilter,
          currentStatus: "RESOLVED",
          resolvedAt: { gte: today, lte: todayEnd },
        } as any,
      }),

      // 9. Avg resolution time (scoped to user)
      prisma.complaint.findMany({
        where: {
          ...complaintFilter,
          currentStatus: "RESOLVED",
          resolvedAt: { not: null },
        } as any,
        select: { createdAt: true, resolvedAt: true },
      }),
    ]);

    // -- Build overview ------------------------------------------------
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

    // -- Build status breakdown ---------------------------------------
    const byStatus = statusCounts.map((s) => ({
      status: s.currentStatus,
      count: s._count.id,
      label: STATUS_LABELS[s.currentStatus] ?? s.currentStatus,
    }));

    // -- Build priority breakdown -------------------------------------
    const byPriority = priorityCounts.map((p) => ({
      priority: p.priority,
      count: p._count.id,
      label: PRIORITY_LABELS[p.priority] ?? p.priority,
    }));

    // -- Build recent activity ----------------------------------------
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

    // -- Build team workload ------------------------------------------
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

    // -- Build agent load ---------------------------------------------
    const agentIds = agentCounts.map((a) => a.assignedAgentId).filter(Boolean) as string[];

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

    // -- Build performance metrics ------------------------------------
    const resolvedComplaints = resolutionTimes as Array<{ createdAt: Date; resolvedAt: Date | null }>;
    const totalResolutionMs = resolvedComplaints.reduce((sum, c) => {
      if (c.resolvedAt) return sum + (c.resolvedAt.getTime() - c.createdAt.getTime());
      return sum;
    }, 0);
    const avgResolutionTimeHours = resolvedComplaints.length > 0
      ? totalResolutionMs / resolvedComplaints.length / (1000 * 60 * 60)
      : null;

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
      scope: isExecutive ? "executive" : isTeamLead ? "team" : isStaff ? "staff" : "product",
    });

    return successResponse(response);
  } catch (error) {
    logger.error("Dashboard fetch failed", ctx, error);
    return internalErrorResponse("Failed to load dashboard data");
  }
}
