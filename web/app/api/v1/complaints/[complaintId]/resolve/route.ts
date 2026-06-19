// =============================================================================
// ResolveX — Complaint Resolve API
// POST /api/v1/complaints/{complaintId}/resolve
//
// Transitions IN_PROGRESS → RESOLVED with a resolution summary.
// Requires complaint:resolve permission.
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
import { resolveComplaintSchema } from "@/lib/validators/status";
import {
  executeTransition,
  buildStatusNotifications,
} from "@/lib/services/status-workflow-engine";

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/v1/complaints/{complaintId}/resolve
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/complaints/{complaintId}/resolve
 *
 * Resolves a complaint that is currently IN_PROGRESS. Requires a resolution
 * summary (20–2000 chars). Creates a status history record, timeline event
 * with RESOLUTION type, and sends notifications to team leads and customer.
 *
 * Request body (application/json):
 *   - resolutionSummary: string (required, 20–2000 chars)
 *
 * Responses:
 *   200 – Complaint resolved
 *   404 – Complaint not found
 *   409 – Complaint is not in a resolvable status (must be IN_PROGRESS)
 *   422 – Validation error
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ complaintId: string }> },
) {
  const ctx: Record<string, unknown> = {};

  try {
    // ── Authorization ────────────────────────────────────────────────
    const auth = await requirePermissions(request, Permissions.COMPLAINT_RESOLVE);
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
        assignedTeamId: true,
        productId: true,
      },
    });

    if (!complaint) {
      return notFoundResponse("Complaint not found");
    }

    ctx.ticketNumber = complaint.ticketNumber;
    ctx.currentStatus = complaint.currentStatus;

    // ── Validate: must be IN_PROGRESS ─────────────────────────────────
    if (complaint.currentStatus !== "IN_PROGRESS") {
      return conflictResponse(
        `Cannot resolve a complaint with status "${complaint.currentStatus}". ` +
        "Complaint must be IN_PROGRESS to resolve.",
      );
    }

    // ── Parse & Validate Body ────────────────────────────────────────
    const body = await request.json();
    const parsed = resolveComplaintSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      return validationErrorResponse(details);
    }

    const { resolutionSummary } = parsed.data;
    ctx.hasResolution = true;

    // ── Execute the resolve transition in a transaction ───────────────
    const updated = await prisma.$transaction(async (tx: any) => {
      await executeTransition(tx, {
        complaintId,
        currentStatus: complaint.currentStatus,
        transitionId: "resolve",
        actorId: auth.user.userId,
        remarks: resolutionSummary,
      });

      return tx.complaint.findUnique({
        where: { id: complaintId },
        select: complaintSelect,
      });
    });

    // ── Send notifications (fire-and-forget) ──────────────────────────
    buildStatusNotifications(
      complaintId,
      complaint.ticketNumber,
      complaint.productId,
      complaint.currentStatus,
      "RESOLVED",
      "resolve",
      resolutionSummary,
    ).then((notifications) => {
      if (notifications.length > 0) {
        prisma.notification.createMany({ data: notifications as any }).catch((err) => {
          logger.warn("Failed to send resolution notifications", { ...ctx }, err);
        });
      }
    });

    logger.info("Complaint resolved", {
      ...ctx,
      toStatus: "RESOLVED",
    });

    return successResponse(toComplaintResponse(updated));
  } catch (error) {
    logger.error("Complaint resolve failed", ctx, error);
    return internalErrorResponse("Failed to resolve complaint");
  }
}
