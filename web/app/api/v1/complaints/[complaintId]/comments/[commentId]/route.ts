// =============================================================================
// ResolveX — Single Comment API
// PATCH  /api/v1/complaints/{complaintId}/comments/{commentId} → Edit comment
// DELETE /api/v1/complaints/{complaintId}/comments/{commentId} → Delete comment
// =============================================================================

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/permissions";
import { requirePermissions } from "@/lib/rbac";
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";
import {
  editCommentSchema,
  commentSelect,
  toCommentResponse,
} from "@/lib/validators/comment";

// ═══════════════════════════════════════════════════════════════════════════
// PATCH /api/v1/complaints/{complaintId}/comments/{commentId}
// ═══════════════════════════════════════════════════════════════════════════

/**
 * PATCH /api/v1/complaints/{complaintId}/comments/{commentId}
 *
 * Edits a comment. Only the comment author can edit their own comment.
 * Requires `complaint:comment` permission.
 * Sets isEdited = true and updates updatedAt.
 *
 * Request body (application/json):
 *   - content: string (required, 1–2000 chars)
 *
 * Responses:
 *   200 – Comment updated
 *   403 – Not the comment author
 *   404 – Comment not found
 *   422 – Validation error
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ complaintId: string; commentId: string }> },
) {
  const ctx: Record<string, unknown> = {};

  try {
    // -- Authorization ------------------------------------------------
    const auth = await requirePermissions(request, Permissions.COMPLAINT_COMMENT);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // -- Extract params -----------------------------------------------
    const { complaintId, commentId } = await params;
    ctx.complaintId = complaintId;
    ctx.commentId = commentId;

    // -- Verify comment exists and belongs to the user -----------------
    const existing = await prisma.comment.findFirst({
      where: { id: commentId, complaintId },
      select: { id: true, userId: true },
    });

    if (!existing) {
      return notFoundResponse("Comment not found");
    }

    if (existing.userId !== auth.user.userId) {
      return forbiddenResponse("You can only edit your own comments");
    }

    // -- Parse & Validate Body ----------------------------------------
    const body = await request.json();
    const parsed = editCommentSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      return validationErrorResponse(details);
    }

    const { content } = parsed.data;

    // -- Update the comment -------------------------------------------
    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content,
        isEdited: true,
      },
      select: commentSelect,
    });

    logger.info("Comment edited", {
      ...ctx,
      contentLength: content.length,
    });

    return successResponse(toCommentResponse(updated));
  } catch (error) {
    logger.error("Comment edit failed", ctx, error);
    return internalErrorResponse("Failed to edit comment");
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/v1/complaints/{complaintId}/comments/{commentId}
// ═══════════════════════════════════════════════════════════════════════════

/**
 * DELETE /api/v1/complaints/{complaintId}/comments/{commentId}
 *
 * Deletes a comment. The comment author can always delete their own comments.
 * Users with `complaint:comment:delete:any` permission can delete any comment
 * on complaints assigned to their team.
 * Requires `complaint:comment` permission.
 *
 * Responses:
 *   200 – Comment deleted
 *   403 – Not authorized to delete
 *   404 – Comment not found
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ complaintId: string; commentId: string }> },
) {
  const ctx: Record<string, unknown> = {};

  try {
    // -- Authorization ------------------------------------------------
    const auth = await requirePermissions(request, Permissions.COMPLAINT_COMMENT);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // -- Extract params -----------------------------------------------
    const { complaintId, commentId } = await params;
    ctx.complaintId = complaintId;
    ctx.commentId = commentId;

    // -- Verify comment exists -----------------------------------------
    const existing = await prisma.comment.findFirst({
      where: { id: commentId, complaintId },
      select: {
        id: true,
        userId: true,
        complaint: {
          select: { assignedTeamId: true },
        },
      },
    });

    if (!existing) {
      return notFoundResponse("Comment not found");
    }

    // -- Ownership or team-lead check ---------------------------------
    const isOwner = existing.userId === auth.user.userId;

    if (!isOwner) {
      // Check if user is a LEAD on the assigned team
      if (!existing.complaint.assignedTeamId) {
        return forbiddenResponse("You can only delete your own comments on unassigned complaints");
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
        return forbiddenResponse("You can only delete your own comments");
      }
    }


    // ── Delete the comment and create timeline event in transaction ────
    await prisma.$transaction(async (tx: any) => {
      await tx.comment.delete({
        where: { id: commentId },
      });

      await tx.complaintTimeline.create({
        data: {
          complaintId,
          eventType: "COMMENT",
          actorId: auth.user.userId,
          eventData: {
            action: "deleted",
            commentId,
          } as any,
        },
      });
    });

    logger.info("Comment deleted", ctx);

    return successResponse({ deleted: true });
  } catch (error) {
    logger.error("Comment delete failed", ctx, error);
    return internalErrorResponse("Failed to delete comment");
  }
}
