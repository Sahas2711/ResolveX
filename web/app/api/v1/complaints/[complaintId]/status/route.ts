// =============================================================================
// ResolveX — Complaint Status Transition API
// POST /api/v1/complaints/{complaintId}/status
//
// Handles general status transitions that use the complaint:update:status
// permission: ASSIGNED→IN_PROGRESS, IN_PROGRESS→WAITING_CUSTOMER,
// WAITING_CUSTOMER→IN_PROGRESS, REOPENED→IN_PROGRESS, etc.
// =============================================================================

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/permissions";
import { requirePermissions, getUserPermissions } from "@/lib/rbac";
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  validationErrorResponse,
  internalErrorResponse,
  conflictResponse,
} from "@/lib/response";
import {
  complaintSelect,
  toComplaintResponse,
} from "@/lib/validators/complaint";
import { statusTransitionSchema } from "@/lib/validators/status";
import {
  validateTransition,
  executeTransition,
  getAvailableTransitions,
} from "@/lib/services/status-workflow-engine";

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/v1/complaints/{complaintId}/status
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/complaints/{complaintId}/status
 *
 * Transitions a complaint's status. The allowed transitions depend on the
 * complaint's current status. The engine validates that the requested
 * transition is valid and that the user has the required permission.
 *
 * Request body (application/json):
 *   - transitionId: string (required) — e.g., "start", "wait", "resume"
 *   - remarks:      string (optional) — reason or notes for the transition
 *
 * Responses:
 *   200 – Status transition successful
 *   403 – Transition not allowed from current status
 *   404 – Complaint not found
 *   409 – Transition invalid for current status
 *   422 – Validation error
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ complaintId: string }> },
) {
  const ctx: Record<string, unknown> = {};

  try {
    // -- Authorization ------------------------------------------------
    const auth = await requirePermissions(request, Permissions.COMPLAINT_UPDATE_STATUS);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // Fetch full permission list for transition filtering
    const userPermissions = await getUserPermissions(auth.user.userId);
    ctx.userPermissions = userPermissions;

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
        assignedTeamId: true,
        assignedAgentId: true,
        productId: true,
      },
    });

    if (!complaint) {
      return notFoundResponse("Complaint not found");
    }

    ctx.ticketNumber = complaint.ticketNumber;
    ctx.currentStatus = complaint.currentStatus;

    // -- Parse & Validate Body ----------------------------------------
    const body = await request.json();
    const parsed = statusTransitionSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      return validationErrorResponse(details);
    }

    const { transitionId, remarks } = parsed.data;
    ctx.transitionId = transitionId;

    // -- Validate the transition — check engine permissions too -------
    const def = validateTransition(complaint.currentStatus, transitionId);

    if (!def) {
      // Check available transitions for a helpful error message
      const available = getAvailableTransitions(complaint.currentStatus, userPermissions);
      const availableIds = available.map((t) => t.id);
      return conflictResponse(
        `Transition "${transitionId}" is not available from status "${complaint.currentStatus}". ` +
        `Available transitions: ${availableIds.join(", ") || "none"}.`,
      );
    }

    // Double-check user has the specific permission for this transition
    if (!userPermissions.includes(def.permission as any)) {
      return forbiddenResponse(
        `You need "${def.permission}" permission to perform this transition`,
      );
    }

    // Validate remarks requirement
    if (def.remarksRequired && (!remarks || remarks.trim().length < 1)) {
      return validationErrorResponse([{
        field: "remarks",
        message: def.remarksLabel ? `${def.remarksLabel} is required` : "Remarks are required for this transition",
        constraint: "required",
      }]);
    }

    // -- Execute the transition in a transaction -----------------------
    const updated = await prisma.$transaction(async (tx: any) => {
      // Execute the status transition first
      await executeTransition(tx, {
        complaintId,
        currentStatus: complaint.currentStatus,
        transitionId,
        actorId: auth.user.userId,
        remarks: remarks ?? undefined,
      });

      // Fetch the updated complaint with full select
      return tx.complaint.findUnique({
        where: { id: complaintId },
        select: complaintSelect,
      });
    });

    logger.info("Complaint status transitioned", {
      ...ctx,
      transition: transitionId,
      toStatus: def.to,
      hasRemarks: !!remarks,
    });

    return successResponse(toComplaintResponse(updated));
  } catch (error) {
    logger.error("Complaint status transition failed", ctx, error);
    return internalErrorResponse("Failed to transition complaint status");
  }
}
