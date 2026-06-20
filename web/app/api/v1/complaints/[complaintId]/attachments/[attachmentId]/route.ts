// =============================================================================
// ResolveX — Single Attachment API
// DELETE /api/v1/complaints/{complaintId}/attachments/{attachmentId} → Delete attachment
// =============================================================================

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/permissions";
import { requirePermissions } from "@/lib/rbac";
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  internalErrorResponse,
} from "@/lib/response";
import { deleteFromCloudinary } from "@/lib/cloudinary";

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/v1/complaints/{complaintId}/attachments/{attachmentId}
// ═══════════════════════════════════════════════════════════════════════════

/**
 * DELETE /api/v1/complaints/{complaintId}/attachments/{attachmentId}
 *
 * Deletes an attachment from both Cloudinary storage and the database.
 * The uploader can always delete their own attachments. Users with the
 * `complaint:update` permission (team leads, admins) can delete any
 * attachment on complaints assigned to their team.
 * Requires `complaint:attachment` permission.
 *
 * Responses:
 *   200 – Attachment deleted
 *   403 – Not authorized to delete
 *   404 – Attachment not found
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ complaintId: string; attachmentId: string }> },
) {
  const ctx: Record<string, unknown> = {};

  try {
    // ── Authorization ────────────────────────────────────────────────
    const auth = await requirePermissions(request, Permissions.COMPLAINT_ATTACHMENT);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // ── Extract params ───────────────────────────────────────────────
    const { complaintId, attachmentId } = await params;
    ctx.complaintId = complaintId;
    ctx.attachmentId = attachmentId;

    // ── Verify attachment exists ─────────────────────────────────────
    const existing = await prisma.attachment.findFirst({
      where: { id: attachmentId, complaintId },
      select: {
        id: true,
        uploadedBy: true,
        storageUrl: true,
        fileName: true,
        complaint: {
          select: { assignedTeamId: true },
        },
      },
    });

    if (!existing) {
      return notFoundResponse("Attachment not found");
    }

    // ── Ownership or team-lead check ─────────────────────────────────
    const isOwner = existing.uploadedBy === auth.user.userId;

    if (!isOwner) {
      // Check if user is a LEAD on the assigned team
      if (!existing.complaint.assignedTeamId) {
        return forbiddenResponse("You can only delete your own attachments on unassigned complaints");
      }

      const teamMembership = await prisma.teamMember.findFirst({
        where: {
          teamId: existing.complaint.assignedTeamId,
          userId: auth.user.userId,
          role: "LEAD",
        },
        select: { id: true },
      });

      if (!teamMembership) {
        return forbiddenResponse("You can only delete your own attachments");
      }
    }

    // ── Delete from Cloudinary using stored public ID ────────────────
    if (existing.storagePublicId) {
      try {
        await deleteFromCloudinary(existing.storagePublicId);
      } catch (cloudError) {
        logger.warn("Cloudinary deletion failed, proceeding with DB deletion", 
          { ...ctx, publicId: existing.storagePublicId }, cloudError);
      }
    }

    // ── Delete from database ─────────────────────────────────────────
    await prisma.attachment.delete({
      where: { id: attachmentId },
    });

    logger.info("Attachment deleted", {
      ...ctx,
      fileName: existing.fileName,
    });

    return successResponse({ deleted: true });
  } catch (error) {
    logger.error("Attachment delete failed", ctx, error);
    return internalErrorResponse("Failed to delete attachment");
  }
}
