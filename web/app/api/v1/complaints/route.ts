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
import { resolveBestAssignment } from "@/lib/services/auto-assignment-engine";

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
