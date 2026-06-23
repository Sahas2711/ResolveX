// =============================================================================
// ResolveX — Complaint Escalate API
// POST /api/v1/complaints/{complaintId}/escalate
//
// Transitions any status → ESCALATED with a reason and escalation level.
// Requires complaint:escalate permission (team leads and admins).
// =============================================================================

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/permissions";
import { requirePermissions } from "@/lib/rbac";
import {
  successResponse,
  notFoundResponse,
  conflictResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";
import {
  complaintSelect,
  toComplaintResponse,
} from "@/lib/validators/complaint";
import { escalateComplaintSchema } from "@/lib/validators/status";
import {
  executeTransition,
  buildStatusNotifications,
} from "@/lib/services/status-workflow-engine";

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/v1/complaints/{complaintId}/escalate
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/complaints/{complaintId}/escalate
 *
 * Escalates a complaint from any status to ESCALATED. Requires a reason
 * (10–500 chars) and an optional escalation level (L1, L2, L3, MANAGEMENT).
 * Creates a status history record, timeline event with ESCALATION type,
 * and sends notifications to team leads and customer.
 *
 * Request body (application/json):
 *   - reason:          string (required, 10–500 chars)
 *   - escalationLevel: "L1" | "L2" | "L3" | "MANAGEMENT" (optional, default "L1")
 *
 * Responses:
 *   200 – Complaint escalated
 *   404 – Complaint not found
 *   409 – Complaint is already escalated
 *   422 – Validation error
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ complaintId: string }> },
) {
  const ctx: Record<string, unknown> = {};

  try {
    // -- Authorization ------------------------------------------------
    const auth = await requirePermissions(request, Permissions.COMPLAINT_ESCALATE);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // -- Extract complaintId ------------------------------------------
    const { complaintId } = await params;
    ctx.complaintId = complaintId;

    // -- Verify complaint exists --------------------------------------
    const complaint = await prisma.complaint.findFirst({
      where: { id: complaintId, deletedAt: null },
      select: {
        id: true,
        ticketNumber: true,
        currentStatus: true,
        productId: true,
        assignedTeamId: true,
        assignedAgentId: true,
      },
    });

    if (!complaint) {
      return notFoundResponse("Complaint not found");
    }

    ctx.ticketNumber = complaint.ticketNumber;
    ctx.currentStatus = complaint.currentStatus;

    // -- Validate: not already escalated -------------------------------
    if (complaint.currentStatus === "ESCALATED") {
      return conflictResponse("Complaint is already escalated");
    }

    // -- Parse & Validate Body ----------------------------------------
    const body = await request.json();
    const parsed = escalateComplaintSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      return validationErrorResponse(details);
    }

    const { reason, escalationLevel } = parsed.data;

    // -- Execute the escalate transition in a transaction --------------
    const updated = await prisma.$transaction(async (tx: any) => {
      // 1. Execute the status transition
      await executeTransition(tx, {
        complaintId,
        currentStatus: complaint.currentStatus,
        transitionId: "escalate",
        actorId: auth.user.userId,
        remarks: reason,
      });

      // 2. Create an escalation record
      await tx.escalation.create({
        data: {
          complaintId,
          escalationLevel: escalationLevel as any,
          escalatedToTeam: complaint.assignedTeamId,
          escalatedToUser: complaint.assignedAgentId,
          reason,
        },
      });

      // 3. Fetch the updated complaint
      return tx.complaint.findUnique({
        where: { id: complaintId },
        select: complaintSelect,
      });
    });

    // -- Send notifications (fire-and-forget) --------------------------
    buildStatusNotifications(
      complaintId,
      complaint.ticketNumber,
      complaint.productId,
      complaint.currentStatus,
      "ESCALATED",
      "escalate",
      reason,
    ).then((notifications) => {
      if (notifications.length > 0) {
        prisma.notification.createMany({ data: notifications as any }).catch((err) => {
          logger.warn("Failed to send escalation notifications", { ...ctx }, err);
        });
      }
    });

    logger.info("Complaint escalated", {
      ...ctx,
      toStatus: "ESCALATED",
      escalationLevel,
      reason,
    });

    return successResponse(toComplaintResponse(updated));
  } catch (error) {
    logger.error("Complaint escalation failed", ctx, error);
    return internalErrorResponse("Failed to escalate complaint");
  }
}
