// =============================================================================
// ResolveX — Complaint Close API
// POST /api/v1/complaints/{complaintId}/close
//
// Transitions RESOLVED → CLOSED with optional closure notes.
// Requires complaint:close permission (team leads and admins).
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
import { closeComplaintSchema } from "@/lib/validators/status";
import { executeTransition } from "@/lib/services/status-workflow-engine";

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/v1/complaints/{complaintId}/close
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/complaints/{complaintId}/close
 *
 * Closes a resolved complaint. Only complaints in RESOLVED status can be
 * closed. This is typically performed by a team lead or admin to confirm
 * that the resolution is satisfactory.
 *
 * Request body (application/json):
 *   - closureNotes: string (optional, max 500 chars)
 *
 * Responses:
 *   200 – Complaint closed
 *   404 – Complaint not found
 *   409 – Complaint is not in RESOLVED status
 *   422 – Validation error
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ complaintId: string }> },
) {
  const ctx: Record<string, unknown> = {};

  try {
    // ── Authorization ────────────────────────────────────────────────
    const auth = await requirePermissions(request, Permissions.COMPLAINT_CLOSE);
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

    // ── Validate: must be RESOLVED ────────────────────────────────────
    if (complaint.currentStatus !== "RESOLVED") {
      return conflictResponse(
        `Cannot close a complaint with status "${complaint.currentStatus}". ` +
        "Complaint must be RESOLVED to close.",
      );
    }

    // ── Parse & Validate Body ────────────────────────────────────────
    const body = await request.json();
    const parsed = closeComplaintSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      return validationErrorResponse(details);
    }

    const { closureNotes } = parsed.data;

    // ── Execute the close transition in a transaction ─────────────────
    const updated = await prisma.$transaction(async (tx: any) => {
      await executeTransition(tx, {
        complaintId,
        currentStatus: complaint.currentStatus,
        transitionId: "close",
        actorId: auth.user.userId,
        remarks: closureNotes ?? undefined,
      });

      return tx.complaint.findUnique({
        where: { id: complaintId },
        select: complaintSelect,
      });
    });

    logger.info("Complaint closed", {
      ...ctx,
      toStatus: "CLOSED",
      hasNotes: !!closureNotes,
    });

    return successResponse(toComplaintResponse(updated));
  } catch (error) {
    logger.error("Complaint close failed", ctx, error);
    return internalErrorResponse("Failed to close complaint");
  }
}
