// =============================================================================
// ResolveX — Complaints API
// GET   /api/v1/complaints → List/search/filter complaints
// POST  /api/v1/complaints → Create a new complaint (triggers auto‑assignment)
// =============================================================================

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/permissions";
import { requirePermissions } from "@/lib/rbac";
import {
  createdResponse,
  successResponse,
  notFoundResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";
import {
  createComplaintSchema,
  mapApiPriorityToPrisma,
  mapApiSeverityToPrisma,
  complaintSelect,
  toComplaintResponse,
} from "@/lib/validators/complaint";
import { resolveBestAssignment } from "@/lib/services/auto-assignment-engine";
import { z } from "zod";

// ── Zod Schema for list query params ───────────────────────────────────────

const listComplaintsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),        // comma-separated: "open,assigned"
  priority: z.string().optional(),      // comma-separated: "high,critical"
  severity: z.string().optional(),      // comma-separated: "major,critical"
  product: z.string().uuid().optional(),
  team: z.string().uuid().optional(),
  agent: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  slaStatus: z.enum(["breached", "at_risk", "compliant"]).optional(),
  sort: z.string().default("-createdAt"),
});

// ── Ticket Number Generation ───────────────────────────────────────────────

/**
 * Generates a unique ticket number in the format TKT-YYYYMMDD-XXXX
 * where XXXX is a zero-padded daily sequence number.
 */
async function generateTicketNumber(): Promise<string> {
  const today = new Date();
  const dateStr =
    today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, "0") +
    String(today.getDate()).padStart(2, "0");

  const prefix = `TKT-${dateStr}-`;    // Find the highest existing sequence number for today
  const lastTicket = await prisma.complaint.findFirst({
    where: {
      ticketNumber: { startsWith: prefix },
    },
    select: { ticketNumber: true },
    orderBy: { ticketNumber: "desc" },
    take: 1,
  });

  let nextSeq = 1;
  if (lastTicket) {
    const lastSeq = parseInt(lastTicket.ticketNumber.slice(-4), 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

// ── Create Assignment Notification ────────────────────────────────────────

async function createAssignmentNotification(
  complaintId: string,
  ticketNumber: string,
  teamId: string | null,
  agentId?: string | null,
): Promise<void> {
  if (!teamId && !agentId) return;

  const notifications: Array<{
    userId: string;
    title: string;
    message: string;
    type: "ASSIGNMENT";
    referenceId: string;
  }> = [];

  // Notify team leads about the new assignment
  if (teamId) {
    const teamLeads = await prisma.teamMember.findMany({
      where: { teamId, role: "LEAD" },
      select: { userId: true },
    });

    for (const tl of teamLeads) {
      notifications.push({
        userId: tl.userId,
        title: "New complaint assigned to team",
        message: `Complaint ${ticketNumber} has been assigned to your team.`,
        type: "ASSIGNMENT",
        referenceId: complaintId,
      });
    }
  }

  // Notify the assigned agent directly
  if (agentId) {
    notifications.push({
      userId: agentId,
      title: "New complaint assigned to you",
      message: `Complaint ${ticketNumber} has been assigned to you.`,
      type: "ASSIGNMENT",
      referenceId: complaintId,
    });
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/v1/complaints
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/complaints
 *
 * Lists, searches, and filters complaints with full pagination support.
 * Requires `complaint:read:all` permission.
 *
 * Query parameters:
 *   - page:      integer (1-based, default 1)
 *   - pageSize:  integer (1–100, default 20)
 *   - search:    string  — matches ticketNumber, title, description
 *   - status:    string  — comma-separated (e.g. "open,assigned,in_progress")
 *   - priority:  string  — comma-separated (e.g. "high,critical")
 *   - severity:  string  — comma-separated (e.g. "major,critical")
 *   - product:   UUID    — filter by product
 *   - team:      UUID    — filter by assigned team
 *   - agent:     UUID    — filter by assigned agent
 *   - dateFrom:  ISO date — filter complaints created on or after
 *   - dateTo:    ISO date — filter complaints created on or before
 *   - slaStatus: "breached" | "at_risk" | "compliant" — SLA deadline filter
 *   - sort:      string  — e.g. "-createdAt,+priority" (default "-createdAt")
 *
 * Responses:
 *   200 – Paginated list of complaints
 */
export async function GET(request: Request) {
  const ctx: Record<string, unknown> = {};

  try {
    // ── Authorization ────────────────────────────────────────────────
    const auth = await requirePermissions(request, Permissions.COMPLAINT_READ_ALL);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // ── Parse Query Parameters ───────────────────────────────────────
    const url = new URL(request.url);
    const queryParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const parsed = listComplaintsSchema.safeParse(queryParams);
    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      return validationErrorResponse(details);
    }

    const { page, pageSize, search, status, priority, severity, product, team, agent, dateFrom, dateTo, slaStatus, sort } = parsed.data;

    // ── Build where clause ───────────────────────────────────────────
    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    // Text search: matches ticketNumber, title, description
    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Status filter: comma-separated list → Prisma enum values (uppercase)
    if (status) {
      const statusValues = status.split(",").map((s) => {
        const map: Record<string, string> = {
          open: "OPEN",
          assigned: "ASSIGNED",
          in_progress: "IN_PROGRESS",
          waiting_for_customer: "WAITING_CUSTOMER",
          resolved: "RESOLVED",
          reopened: "REOPENED",
          closed: "CLOSED",
          escalated: "ESCALATED",
        };
        return map[s.trim().toLowerCase()] ?? s.trim().toUpperCase();
      }).filter(Boolean);
      if (statusValues.length > 0) {
        where.currentStatus = { in: statusValues };
      }
    }

    // Priority filter: comma-separated → Prisma enum values
    if (priority) {
      const priorityValues = priority.split(",").map((p) => {
        const map: Record<string, string> = {
          low: "LOW",
          medium: "MEDIUM",
          high: "HIGH",
          critical: "CRITICAL",
        };
        return map[p.trim().toLowerCase()];
      }).filter(Boolean);
      if (priorityValues.length > 0) {
        where.priority = { in: priorityValues };
      }
    }

    // Severity filter: comma-separated → Prisma enum values
    if (severity) {
      const severityValues = severity.split(",").flatMap((s) => {
        const map: Record<string, string[]> = {
          minor: ["LOW"],
          major: ["MEDIUM"],
          critical: ["HIGH", "SEVERE"],
        };
        return map[s.trim().toLowerCase()] ?? [];
      });
      if (severityValues.length > 0) {
        where.severity = { in: severityValues };
      }
    }

    // UUID filters
    if (product) where.productId = product;
    if (team) where.assignedTeamId = team;
    if (agent) where.assignedAgentId = agent;

    // Date range filter
    if (dateFrom || dateTo) {
      const createdAtFilter: Record<string, Date> = {};
      if (dateFrom) createdAtFilter.gte = new Date(dateFrom);
      if (dateTo) createdAtFilter.lte = new Date(dateTo);
      where.createdAt = createdAtFilter;
    }

    // ── SLA status filter (post-query) ─────────────────────────────
    // We'll apply this after fetching if needed, since it requires
    // comparing deadline fields against the current time.
    const needsSlaFilter = !!slaStatus;

    // ── Parse sort ───────────────────────────────────────────────────
    const orderBy: Record<string, string>[] = [];
    const sortFields = sort.split(",");
    for (const field of sortFields) {
      const trimmed = field.trim();
      if (trimmed.startsWith("-")) {
        orderBy.push({ [mapComplaintSortField(trimmed.slice(1))]: "desc" });
      } else if (trimmed.startsWith("+")) {
        orderBy.push({ [mapComplaintSortField(trimmed.slice(1))]: "asc" });
      } else {
        orderBy.push({ [mapComplaintSortField(trimmed)]: "asc" });
      }
    }

    // ── Execute query ────────────────────────────────────────────────
    const skip = (page - 1) * pageSize;

    let [complaints, totalItems] = await Promise.all([
      prisma.complaint.findMany({
        where: where as any,
        orderBy,
        skip,
        take: pageSize,
        select: complaintSelect,
      }),
      prisma.complaint.count({ where: where as any }),
    ]);

    // ── Post-query SLA status filter ─────────────────────────────────
    // Note: SLA filtering is applied post-query since it requires
    // runtime date comparison. totalItems is kept from the pre-filter
    // count as an approximation; pagination accuracy may vary.
    if (needsSlaFilter && complaints.length > 0) {
      const now = new Date();
      complaints = complaints.filter((c) => {
        const deadline = c.slaResolutionDeadline ?? c.slaFirstResponseDeadline;
        if (!deadline) return slaStatus === "compliant";
        const diff = deadline.getTime() - now.getTime();
        const hoursLeft = diff / (1000 * 60 * 60);
        switch (slaStatus) {
          case "breached": return diff < 0;
          case "at_risk": return diff >= 0 && hoursLeft <= 4;
          case "compliant": return diff > 0 && hoursLeft > 4;
          default: return true;
        }
      });
      logger.warn("SLA filter applied post-query — totalItems is approximate", {
        ...ctx,
        slaStatus,
        preFilterCount: totalItems,
        postFilterCount: complaints.length,
      });
    }

    const totalPages = Math.ceil(totalItems / pageSize);

    logger.info("Complaints listed", {
      ...ctx,
      page,
      pageSize,
      totalItems,
      filters: { search, status, priority, severity, product, team, agent, dateFrom, dateTo, slaStatus, sort },
    });

    return successResponse(complaints.map(toComplaintResponse), {
      page,
      pageSize,
      totalItems,
      totalPages,
    });
  } catch (error) {
    logger.error("Complaint listing failed", ctx, error);
    return internalErrorResponse("Failed to list complaints");
  }
}

// ── Sort Field Mapping ─────────────────────────────────────────────────────

function mapComplaintSortField(field: string): string {
  const fieldMap: Record<string, string> = {
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    priority: "priority",
    severity: "severity",
    status: "currentStatus",
    ticketNumber: "ticketNumber",
  };
  return fieldMap[field] ?? "createdAt";
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/v1/complaints
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/complaints
 *
 * Creates a new complaint and triggers auto-assignment to the responsible
 * support team based on configured AssignmentRules or ProductTeamMappings.
 *
 * Request body (application/json):
 *   - productId:   string (required, UUID)
 *   - category:    string (required, complaint category name)
 *   - priority:    "low" | "medium" | "high" | "critical" (required)
 *   - severity:    "minor" | "major" | "critical" (required)
 *   - description: string (required, 20–5000 chars)
 *
 * Responses:
 *   201 – Complaint created and assigned
 *   404 – Product or category not found
 *   422 – Validation error
 */
export async function POST(request: Request) {
  const ctx: Record<string, unknown> = {};

  try {
    // ── Authorization ────────────────────────────────────────────────
    const auth = await requirePermissions(request, Permissions.COMPLAINT_CREATE);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // ── Parse & Validate Body ────────────────────────────────────────
    const body = await request.json();
    const parsed = createComplaintSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      return validationErrorResponse(details);
    }

    const { productId, category: categoryName, priority, severity, description } = parsed.data;

    // ── Verify product exists (not deleted) ───────────────────────────
    const product = await prisma.product.findFirst({
      where: { id: productId, deletedAt: null, status: { not: "DISABLED" } },
      select: { id: true, productName: true },
    });

    if (!product) {
      return notFoundResponse("Product not found or is disabled");
    }

    // ── Look up category by name ─────────────────────────────────────
    const category = await prisma.complaintCategory.findFirst({
      where: {
        name: { equals: categoryName, mode: "insensitive" },
        OR: [
          { productId },
          { productId: null },
        ],
      },
      select: { id: true, name: true },
    });

    if (!category) {
      return notFoundResponse(
        `Category "${categoryName}" not found for this product`,
      );
    }

    ctx.productId = productId;
    ctx.category = categoryName;

    // ── Map enums ────────────────────────────────────────────────────
    const prismaPriority = mapApiPriorityToPrisma(priority);
    const prismaSeverity = mapApiSeverityToPrisma(severity);

    // ── Generate ticket number ────────────────────────────────────────
    const ticketNumber = await generateTicketNumber();
    ctx.ticketNumber = ticketNumber;

    // ── Auto-assign using the load-balanced engine ────────────────────
    const { assignedTeamId, assignedAgentId } = await resolveBestAssignment(
      productId,
      prismaPriority,
      category.id,
    );

    // ── Determine status based on assignment ──────────────────────────
    const currentStatus = assignedTeamId ? "ASSIGNED" : "OPEN";

    // ── Create complaint in transaction ───────────────────────────────
    const complaint = await prisma.$transaction(async (tx: any) => {
      // 1. Create the complaint
      const created = await tx.complaint.create({
        data: {
          ticketNumber,
          title: categoryName,
          description,
          customerId: auth.user.userId,
          productId,
          categoryId: category.id,
          priority: prismaPriority,
          severity: prismaSeverity,
          currentStatus,
          assignedTeamId,
          assignedAgentId,
          source: "web",
        },
        select: complaintSelect,
      });

      // 2. Create assignment record (if assigned)
      if (assignedTeamId) {
        await tx.assignment.create({
          data: {
            complaintId: created.id,
            assignedTeamId,
            assignedAgentId,
            assignedBy: "SYSTEM",
            assignmentReason: "Auto-assigned by system upon complaint creation",
          },
        });
      }

      // 3. Create timeline event for creation
      await tx.complaintTimeline.create({
        data: {
          complaintId: created.id,
          eventType: "STATUS_CHANGE",
          actorId: auth.user.userId,
          eventData: {
            from: null,
            to: currentStatus,
            description: "Complaint created",
          } as any,
        },
      });

      return created;
    });

    // ── Notify team leads and assigned agent (fire-and-forget) ─────────
    if (assignedTeamId || assignedAgentId) {
      createAssignmentNotification(
        complaint.id,
        ticketNumber,
        assignedTeamId,
        assignedAgentId,
      ).catch((err) => {
        logger.warn("Failed to send assignment notification", {
          ...ctx,
          complaintId: complaint.id,
        }, err);
      });
    }

    logger.info("Complaint created", {
      ...ctx,
      complaintId: complaint.id,
      ticketNumber,
      status: currentStatus,
      assignedTeamId: assignedTeamId ?? undefined,
      assignedAgentId: assignedAgentId ?? undefined,
    });

    return createdResponse(toComplaintResponse(complaint as any));
  } catch (error) {
    logger.error("Complaint creation failed", ctx, error);
    return internalErrorResponse("Failed to create complaint");
  }
}
