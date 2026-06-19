// =============================================================================
// ResolveX — Complaints API
// POST /api/v1/complaints → Create a new complaint (triggers auto‑assignment)
// =============================================================================

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/permissions";
import { requirePermissions } from "@/lib/rbac";
import {
  createdResponse,
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

// ── Auto-Assignment Logic ──────────────────────────────────────────────────

interface AutoAssignResult {
  assignedTeamId: string | null;
  assignedAgentId: string | null;
}

/**
 * Attempts to auto-assign a complaint to a team based on:
 *   1. AssignmentRule — matches productId + priority (and optionally category)
 *   2. Fallback — primary ProductTeamMapping for the product
 *
 * Returns the assigned team ID and optionally an agent ID.
 */
async function autoAssignComplaint(
  productId: string,
  priority: string,
  categoryId: string,
): Promise<AutoAssignResult> {
  const ctx: Record<string, unknown> = { productId, priority };

  try {
    // ── Step 1: Look for exact AssignmentRule match ───────────────────
    // Prefer rules that also match the categoryId, then fall back to
    // rules that match only productId + priority.
    const assignmentRule = await prisma.assignmentRule.findFirst({
      where: {
        productId,
        priority: priority as any,
        isActive: true,
        OR: [
          { categoryId },
          { categoryId: null },
        ],
      },
      orderBy: [
        // Rules with a specific categoryId match rank higher
        { categoryId: { sort: "desc", nulls: "last" } },
      ],
      select: { teamId: true },
    });

    if (assignmentRule) {
      logger.info("Auto-assignment: matched AssignmentRule", {
        ...ctx,
        teamId: assignmentRule.teamId,
      });

      return { assignedTeamId: assignmentRule.teamId, assignedAgentId: null };
    }

    // ── Step 2: Fallback to primary ProductTeamMapping ────────────────
    const primaryMapping = await prisma.productTeamMapping.findFirst({
      where: {
        productId,
        isPrimary: true,
      },
      select: { teamId: true },
      orderBy: { loadWeight: "desc" },
    });

    if (primaryMapping) {
      logger.info("Auto-assignment: fallback to primary team mapping", {
        ...ctx,
        teamId: primaryMapping.teamId,
      });
      return { assignedTeamId: primaryMapping.teamId, assignedAgentId: null };
    }

    // ── Step 3: Any team mapping at all (least preferred) ─────────────
    const anyMapping = await prisma.productTeamMapping.findFirst({
      where: { productId },
      select: { teamId: true },
      orderBy: { loadWeight: "desc" },
    });

    if (anyMapping) {
      logger.info("Auto-assignment: fallback to any team mapping", {
        ...ctx,
        teamId: anyMapping.teamId,
      });
      return { assignedTeamId: anyMapping.teamId, assignedAgentId: null };
    }

    logger.info("Auto-assignment: no team found — unassigned", ctx);
    return { assignedTeamId: null, assignedAgentId: null };
  } catch (error) {
    logger.error("Auto-assignment: lookup failed — continuing unassigned", ctx, error);
    return { assignedTeamId: null, assignedAgentId: null };
  }
}

// ── Create Assignment Notification ────────────────────────────────────────

async function createAssignmentNotification(
  complaintId: string,
  ticketNumber: string,
  teamId: string | null,
): Promise<void> {
  if (!teamId) return;

  // Notify team members (team leads first) about the new assignment
  const teamMembers = await prisma.teamMember.findMany({
    where: { teamId, role: "LEAD" },
    select: { userId: true },
  });

  if (teamMembers.length === 0) return;

  await prisma.notification.createMany({
    data: teamMembers.map((tm) => ({
      userId: tm.userId,
      title: "New complaint assigned",
      message: `Complaint ${ticketNumber} has been auto-assigned to your team.`,
      type: "ASSIGNMENT",
      referenceId: complaintId,
    })),
  });
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

    // ── Auto-assign team ──────────────────────────────────────────────
    const { assignedTeamId, assignedAgentId } = await autoAssignComplaint(
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

    // ── Notify team leads (fire-and-forget, outside transaction) ──────
    if (assignedTeamId) {
      createAssignmentNotification(
        complaint.id,
        ticketNumber,
        assignedTeamId,
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
    });

    return createdResponse(toComplaintResponse(complaint as any));
  } catch (error) {
    logger.error("Complaint creation failed", ctx, error);
    return internalErrorResponse("Failed to create complaint");
  }
}
