// =============================================================================
// ResolveX — Complaint Reopen API
// POST /api/v1/complaints/{complaintId}/reopen
//
// Transitions RESOLVED or CLOSED → REOPENED with a required reason.
// Requires complaint:reopen permission.
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
import { reopenComplaintSchema } from "@/lib/validators/status";
import { executeTransition } from "@/lib/services/status-workflow-engine";

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/v1/complaints/{complaintId}/reopen
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/complaints/{complaintId}/reopen
 *
 * Reopens a resolved or closed complaint. A required reason must be provided
 * explaining why the complaint is being reopened. Creates a status history
 * record and timeline event. Clears resolvedAt / closedAt timestamps.
 *
 * Request body (application/json):
 *   - reason: string (required, 10–500 chars)
 *
 * Responses:
 *   200 – Complaint reopened
 *   404 – Complaint not found
 *   409 – Complaint is not in a reopenable status (must be RESOLVED or CLOSED)
 *   422 – Validation error
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ complaintId: string }> },
) {
  const ctx: Record<string, unknown> = {};

  try {
    // ── Authorization ────────────────────────────────────────────────
    const auth = await requirePermissions(request, Permissions.COMPLAINT_REOPEN);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // ── Extract complaintId ──────────────────────────────────────────
    const { complaintId } = await params;
    ctx.complaintId = complaintId;

    // ── Verify complaint exists ──────────────────────────────────────
    const complaint = await prisma.complaint.findFirst({
      where: { id: complaintId, deletedAt: null },
      select: {
        id: true,
        ticketNumber: true,
        currentStatus: true,
        productId: true,
        assignedTeamId: true,
      },
    });

    if (!complaint) {
      return notFoundResponse("Complaint not found");
    }

    ctx.ticketNumber = complaint.ticketNumber;
    ctx.currentStatus = complaint.currentStatus;

    // ── Validate: must be RESOLVED or CLOSED ──────────────────────────
    const reopenableStatuses = ["RESOLVED", "CLOSED"];
    if (!reopenableStatuses.includes(complaint.currentStatus)) {
      return conflictResponse(
        `Cannot reopen a complaint with status "${complaint.currentStatus}". ` +
        "Complaint must be RESOLVED or CLOSED to reopen.",
      );
    }

    // ── Parse & Validate Body ────────────────────────────────────────
    const body = await request.json();
    const parsed = reopenComplaintSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      return validationErrorResponse(details);
    }

    const { reason } = parsed.data;

    // ── Execute the reopen transition in a transaction ────────────────
    const updated = await prisma.$transaction(async (tx: any) => {
      await executeTransition(tx, {
        complaintId,
        currentStatus: complaint.currentStatus,
        transitionId: "reopen",
        actorId: auth.user.userId,
        remarks: reason,
      });

      return tx.complaint.findUnique({
        where: { id: complaintId },
        select: complaintSelect,
      });
    });

    logger.info("Complaint reopened", {
      ...ctx,
      toStatus: "REOPENED",
      reason,
    });

    return successResponse(toComplaintResponse(updated));
  } catch (error) {
    logger.error("Complaint reopen failed", ctx, error);
    return internalErrorResponse("Failed to reopen complaint");
  }
}
