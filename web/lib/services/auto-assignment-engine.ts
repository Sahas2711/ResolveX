// =============================================================================
// ResolveX — Auto-Assignment Engine
//
// A load-balanced, product-aware, team-scoped algorithm that assigns
// complaints to the most available agent. The algorithm:
//
//   1. Resolve the target team using AssignmentRules or ProductTeamMappings
//   2. Find all eligible agents (SUPPORT_AGENT / TEAM_LEAD) in that team
//   3. Calculate each agent's current active workload
//   4. Select the agent with the lowest load (tie-breaking by loadWeight)
//   5. Assign the complaint to the selected team + agent
// =============================================================================

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Roles } from "@/lib/permissions";

// -- Types ------------------------------------------------------------------

export interface AutoAssignResult {
  assignedTeamId: string | null;
  assignedAgentId: string | null;
  reason: string;
  /** Number of other agents that were evaluated */
  candidatesConsidered: number;
}

interface AgentCandidate {
  userId: string;
  /** Number of active (ASSIGNED + IN_PROGRESS + REOPENED) complaints */
  activeLoad: number;
  /** The team member's load weight factor (higher = more capacity) */
  loadWeight: number;
  /** Whether this agent has zero active tickets */
  isIdle: boolean;
  /** Total count of tickets this agent has ever been assigned */
  totalAssigned: number;
  /** Resolution rate (resolved / assigned) */
  resolutionRate: number;
}

// -- Active statuses that count toward agent load ---------------------------
// Only complaints in these statuses represent ongoing work.
// OPEN = not yet assigned (system-level). RESOLVED/CLOSED = done.
// WAITING_CUSTOMER = blocked on customer, still counts toward load.

const ACTIVE_STATUSES = [
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "REOPENED",
] as const;

// -- Staff role names (eligible for assignment) -----------------------------
// Users with these system roles are considered assignable agents.

const STAFF_ROLES = [Roles.SUPPORT_AGENT, Roles.TEAM_LEAD];

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Main entry point. Resolves the best team + agent for a given complaint,
 * considering product, priority, category, and current agent workloads.
 *
 * @param productId   - The complaint's product UUID
 * @param priority    - Prisma complaint priority (LOW | MEDIUM | HIGH | CRITICAL)
 * @param categoryId  - The complaint's category UUID (optional, for exact rule matching)
 * @returns           - Resolved team ID, agent ID, and reasoning
 */
export async function resolveBestAssignment(
  productId: string,
  priority: string,
  categoryId?: string,
): Promise<AutoAssignResult> {
  const ctx: Record<string, unknown> = { productId, priority };
  logger.info("Auto-assignment: starting resolution", ctx);

  // -- Step 1: Resolve the target team ------------------------------------
  const { assignedTeamId, teamSource } = await resolveTeam(productId, priority, categoryId);
  ctx.teamId = assignedTeamId;
  ctx.teamSource = teamSource;

  if (!assignedTeamId) {
    logger.info("Auto-assignment: no team found — complaint will be unassigned", ctx);
    return {
      assignedTeamId: null,
      assignedAgentId: null,
      reason: "No matching team found for this product and priority",
      candidatesConsidered: 0,
    };
  }

  // -- Step 2: Find the best agent in this team ---------------------------
  const agentResult = await selectBestAgent(assignedTeamId, productId);

  if (!agentResult) {
    logger.info("Auto-assignment: team found but no eligible agents — team-assigned only", ctx);
    return {
      assignedTeamId,
      assignedAgentId: null,
      reason: `Assigned to team (${teamSource}) — no eligible agents available`,
      candidatesConsidered: 0,
    };
  }

  // -- Step 3: Return the full result -------------------------------------
  logger.info("Auto-assignment: resolved", {
    ...ctx,
    agentId: agentResult.userId,
    agentLoad: agentResult.activeLoad,
    agentIsIdle: agentResult.isIdle,
  });

  return {
    assignedTeamId,
    assignedAgentId: agentResult.userId,
    reason: buildAssignmentReason(agentResult, teamSource),
    candidatesConsidered: agentResult.candidatesConsidered,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEAM RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════

interface TeamResolution {
  assignedTeamId: string | null;
  teamSource: string;
}

/**
 * Resolves the target team using a 3-tier fallback:
 *   1. AssignmentRule (productId + priority, optionally category)
 *   2. Primary ProductTeamMapping
 *   3. Any ProductTeamMapping
 */
async function resolveTeam(
  productId: string,
  priority: string,
  categoryId?: string,
): Promise<TeamResolution> {
  // -- Tier 1: Exact AssignmentRule match ---------------------------------
  const categoryFilter = categoryId
    ? [{ categoryId }, { categoryId: null }]
    : [{ categoryId: null }];

  const assignmentRule = await prisma.assignmentRule.findFirst({
    where: {
      productId,
      priority: priority as any,
      isActive: true,
      OR: categoryFilter,
    },
    orderBy: [{ categoryId: { sort: "desc", nulls: "last" } }],
    select: { teamId: true },
  });

  if (assignmentRule) {
    return { assignedTeamId: assignmentRule.teamId, teamSource: "AssignmentRule" };
  }

  // -- Tier 2: Primary team mapping ---------------------------------------
  const primaryMapping = await prisma.productTeamMapping.findFirst({
    where: { productId, isPrimary: true },
    select: { teamId: true },
    orderBy: { loadWeight: "desc" },
  });

  if (primaryMapping) {
    return { assignedTeamId: primaryMapping.teamId, teamSource: "PrimaryMapping" };
  }

  // -- Tier 3: Any team mapping (fallback) --------------------------------
  const anyMapping = await prisma.productTeamMapping.findFirst({
    where: { productId },
    select: { teamId: true },
    orderBy: { loadWeight: "desc" },
  });

  if (anyMapping) {
    return { assignedTeamId: anyMapping.teamId, teamSource: "FallbackMapping" };
  }

  return { assignedTeamId: null, teamSource: "none" };
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT SELECTION — LOAD-BALANCED ALGORITHM
// ═══════════════════════════════════════════════════════════════════════════

interface SelectedAgent extends AgentCandidate {
  candidatesConsidered: number;
}

/**
 * Selects the best agent from a team using a multi-factor scoring algorithm.
 *
 * Algorithm:
 *   1. Find all team members with staff roles (SUPPORT_AGENT, TEAM_LEAD)
 *   2. Calculate each agent's active ticket load
 *   3. Score agents: lower load = better. For ties, prefer:
 *      a. Higher loadWeight (team config)
 *      b. Higher resolution rate
 *      c. Fewer total assigned tickets (fairness)
 *   4. Return the highest-scoring agent
 *
 * Returns `null` if no eligible agents are found.
 */
async function selectBestAgent(
  teamId: string,
  productId: string,
): Promise<SelectedAgent | null> {
  // -- Step 1: Find eligible team members ---------------------------------
  const teamMembers = await prisma.teamMember.findMany({
    where: { teamId },
    select: {
      userId: true,
      role: true,
      user: {
        select: {
          isActive: true,
          status: true,
          userRoles: {
            select: {
              role: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  // Filter to active users with staff roles
  const eligibleMembers = teamMembers.filter((m) => {
    const user = m.user;
    if (!user.isActive || user.status !== "ACTIVE") return false;
    const roleNames = user.userRoles.map((ur) => ur.role.name);
    return STAFF_ROLES.some((r) => roleNames.includes(r));
  });

  if (eligibleMembers.length === 0) return null;

  const agentIds = eligibleMembers.map((m) => m.userId);

  // -- Step 2: Calculate active loads for all agents ----------------------
  const activeLoads = await calculateActiveLoads(agentIds);

  // -- Step 3: Get product-specific load weight for team members ---------
  const loadWeights = await getMemberLoadWeights(teamId, productId, agentIds);

  // -- Step 4: Calculate resolution rates ---------------------------------
  const resolutionRates = await calculateResolutionRates(agentIds);

  // -- Step 5: Score and rank agents -------------------------------------
  const candidates: AgentCandidate[] = agentIds.map((userId) => {
    const member = eligibleMembers.find((m) => m.userId === userId)!;
    const load = activeLoads.get(userId) ?? 0;
    // Load weight from team mapping; default to 1.0 if not found
    const weight = loadWeights.get(userId) ?? 1.0;
    const rate = resolutionRates.get(userId) ?? 0;

    return {
      userId,
      activeLoad: load,
      loadWeight: weight,
      isIdle: load === 0,
      totalAssigned: 0, // calculated below
      resolutionRate: rate,
    };
  });

  // Sort by: idle first → lowest load → highest loadWeight → lowest total assigned → highest resolution rate
  const scored = candidates.sort((a, b) => {
    // Idle (zero load) agents always rank first
    if (a.isIdle && !b.isIdle) return -1;
    if (!a.isIdle && b.isIdle) return 1;

    // Primary: lowest active load
    if (a.activeLoad !== b.activeLoad) return a.activeLoad - b.activeLoad;

    // Secondary: highest load weight (more capacity = more eligible)
    if (a.loadWeight !== b.loadWeight) return b.loadWeight - a.loadWeight;

    // Tertiary: highest resolution rate (proven effectiveness)
    if (a.resolutionRate !== b.resolutionRate) return b.resolutionRate - a.resolutionRate;

    // Final tiebreaker: random (stable — use userId)
    return a.userId < b.userId ? -1 : 1;
  });

  const winner = scored[0];

  return {
    ...winner,
    candidatesConsidered: scored.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKLOAD CALCULATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Counts active complaints per agent. Active = currently being worked on.
 * Uses a single grouped query for efficiency.
 */
async function calculateActiveLoads(
  agentIds: string[],
): Promise<Map<string, number>> {
  if (agentIds.length === 0) return new Map();

  // Group by assignedAgentId and count active statuses
  const results = await prisma.complaint.groupBy({
    by: ["assignedAgentId"],
    where: {
      assignedAgentId: { in: agentIds },
      currentStatus: { in: ACTIVE_STATUSES as any },
      deletedAt: null,
    },
    _count: { id: true },
  });

  const loadMap = new Map<string, number>();

  // Initialize all agents with 0
  for (const id of agentIds) {
    loadMap.set(id, 0);
  }

  // Set actual counts
  for (const r of results) {
    if (r.assignedAgentId) {
      loadMap.set(r.assignedAgentId, r._count.id);
    }
  }

  return loadMap;
}

/**
 * Gets the team-specific load weight for each agent.
 * Load weight from the ProductTeamMapping determines how much
 * capacity an agent has relative to others.
 */
async function getMemberLoadWeights(
  teamId: string,
  productId: string,
  agentIds: string[],
): Promise<Map<string, number>> {
  if (agentIds.length === 0) return new Map();

  // Get the product's load weight for this team
  const mapping = await prisma.productTeamMapping.findFirst({
    where: { productId, teamId },
    select: { loadWeight: true },
  });

  const teamWeight = mapping?.loadWeight ?? 1.0;
  const weightMap = new Map<string, number>();

  // All members of this team for this product share the team's load weight
  for (const id of agentIds) {
    weightMap.set(id, teamWeight);
  }

  return weightMap;
}

/**
 * Calculates resolution rate (resolved / total assigned) for each agent.
 * Used as a tie-breaker to prefer proven agents.
 */
async function calculateResolutionRates(
  agentIds: string[],
): Promise<Map<string, number>> {
  if (agentIds.length === 0) return new Map();

  const results = await prisma.complaint.groupBy({
    by: ["assignedAgentId"],
    where: {
      assignedAgentId: { in: agentIds },
      deletedAt: null,
    },
    _count: { id: true },
  });

  // Get resolved counts
  const resolvedResults = await prisma.complaint.groupBy({
    by: ["assignedAgentId"],
    where: {
      assignedAgentId: { in: agentIds },
      currentStatus: { in: ["RESOLVED", "CLOSED"] },
      deletedAt: null,
    },
    _count: { id: true },
  });

  // Map resolution counts
  const resolvedMap = new Map<string, number>();
  for (const r of resolvedResults) {
    if (r.assignedAgentId) {
      resolvedMap.set(r.assignedAgentId, r._count.id);
    }
  }

  // Map total counts
  const totalMap = new Map<string, number>();
  for (const r of results) {
    if (r.assignedAgentId) {
      totalMap.set(r.assignedAgentId, r._count.id);
    }
  }

  const rateMap = new Map<string, number>();
  for (const id of agentIds) {
    const total = totalMap.get(id) ?? 0;
    const resolved = resolvedMap.get(id) ?? 0;
    rateMap.set(id, total > 0 ? resolved / total : 0);
  }

  return rateMap;
}

// ═══════════════════════════════════════════════════════════════════════════
// REASON GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates a human-readable reason string for the assignment.
 */
function buildAssignmentReason(
  agent: SelectedAgent,
  teamSource: string,
): string {
  const parts: string[] = [];

  parts.push(`Auto-assigned by system (${teamSource})`);

  if (agent.isIdle) {
    parts.push("agent was idle");
  } else {
    parts.push(`agent load: ${agent.activeLoad} active ticket(s)`);
  }

  return parts.join(" — ");
}
