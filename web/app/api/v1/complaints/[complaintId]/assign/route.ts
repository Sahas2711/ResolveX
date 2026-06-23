// =============================================================================
// ResolveX — Complaint Assignment API
// POST /api/v1/complaints/{complaintId}/assign → Manual reassignment
// =============================================================================

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/permissions";
import { requirePermissions } from "@/lib/rbac";
import {
  successResponse,
  notFoundResponse,
  badRequestResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";
import {
  complaintSelect,
  toComplaintResponse,
} from "@/lib/validators/complaint";
import { z } from "zod";

// -- Validation Schema ------------------------------------------------------

const assignSchema = z.object({
  teamId: z.string().uuid("Invalid team ID format"),
  staffId: z.string().uuid("Invalid staff ID format"),
  reason: z.string().max(500, "Reason must be at most 500 characters").optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/v1/complaints/{complaintId}/assign
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/complaints/{complaintId}/assign
 *
 * Manually reassigns a complaint to a specific team and staff member.
 * Requires `complaint:reassign` permission (typically team leads and admins).
 * Creates an audit trail via the Assignment and Timeline records.
 *
 * Request body (application/json):
 *   - teamId:  string (required, UUID) — target team
 *   - staffId: string (required, UUID) — target staff member/agent
 *   - reason:  string (optional, max 500 chars) — reason for reassignment
 *
 * Responses:
 *   200 – Complaint reassigned
 *   404 – Complaint, team, staff, or team membership not found
 *   422 – Validation error
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ complaintId: string }> },
) {
  const ctx: Record<string, unknown> = {};

  try {
    // -- Authorization ------------------------------------------------
    const auth = await requirePermissions(request, Permissions.COMPLAINT_REASSIGN);
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
        assignedTeamId: true,
        assignedAgentId: true,
      },
    });

    if (!complaint) {
      return notFoundResponse("Complaint not found");
    }

    // -- Parse & Validate Body ----------------------------------------
    const body = await request.json();
    const parsed = assignSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      return validationErrorResponse(details);
    }

    const { teamId, staffId, reason } = parsed.data;
    ctx.targetTeamId = teamId;
    ctx.targetStaffId = staffId;

    // -- Verify team exists -------------------------------------------
    const team = await prisma.team.findFirst({
      where: { id: teamId, deletedAt: null },
      select: { id: true, teamName: true },
    });

    if (!team) {
      return notFoundResponse("Team not found");
    }

    // -- Verify staff exists and is active ----------------------------
    const staff = await prisma.user.findFirst({
      where: {
        id: staffId,
        isActive: true,
        status: "ACTIVE",
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!staff) {
      return notFoundResponse("Staff member not found or is inactive");
    }

    // -- Verify staff belongs to the target team ----------------------
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: staffId } },
    });

    if (!membership) {
      return badRequestResponse(
        "Staff member is not a member of the specified team",
      );
    }

    // -- Perform reassignment in transaction ---------------------------
    const updatedComplaint = await prisma.$transaction(async (tx: any) => {
      // 1. Update the complaint's assigned team and agent
      const updated = await tx.complaint.update({
        where: { id: complaintId },
        data: {
          assignedTeamId: teamId,
          assignedAgentId: staffId,
          currentStatus: complaint.currentStatus === "OPEN" ? "ASSIGNED" : complaint.currentStatus,
        },
        select: complaintSelect,
      });

      // 2. Create an assignment record
      await tx.assignment.create({
        data: {
          complaintId,
          assignedTeamId: teamId,
          assignedAgentId: staffId,
          assignedBy: complaint.assignedTeamId ? "ADMIN" : "SYSTEM",
          assignmentReason: reason ?? "Manual reassignment by team lead/admin",
        },
      });

      // 3. Create a timeline event for the reassignment
      await tx.complaintTimeline.create({
        data: {
          complaintId,
          eventType: "ASSIGNMENT",
          actorId: auth.user.userId,
          eventData: {
            fromTeamId: complaint.assignedTeamId,
            toTeamId: teamId,
            fromAgentId: complaint.assignedAgentId,
            toAgentId: staffId,
            reason: reason ?? null,
          } as any,
        },
      });

      return updated;
    });

    // -- Notify the newly assigned agent (fire-and-forget) -------------
    try {
      await prisma.notification.create({
        data: {
          userId: staffId,
          title: "Complaint assigned to you",
          message: `Complaint ${complaint.ticketNumber} has been assigned to you${reason ? `: ${reason}` : "."}`,
          type: "ASSIGNMENT",
          referenceId: complaintId,
        },
      });
    } catch (err) {
      logger.warn("Failed to send assignment notification", {
        ...ctx,
        staffId,
      }, err);
    }

    logger.info("Complaint reassigned", {
      ...ctx,
      ticketNumber: complaint.ticketNumber,
      fromTeamId: complaint.assignedTeamId ?? "none",
      fromAgentId: complaint.assignedAgentId ?? "none",
      toTeamId: teamId,
      toAgentId: staffId,
      teamName: team.teamName,
      staffName: `${staff.firstName} ${staff.lastName}`,
    });

    return successResponse(toComplaintResponse(updatedComplaint as any));
  } catch (error) {
    logger.error("Complaint reassignment failed", ctx, error);
    return internalErrorResponse("Failed to reassign complaint");
  }
}
