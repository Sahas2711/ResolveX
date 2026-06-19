// =============================================================================
// ResolveX — Comments API
// GET  /api/v1/complaints/{complaintId}/comments → List comments (paginated)
// POST /api/v1/complaints/{complaintId}/comments → Add comment
// =============================================================================

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/permissions";
import { requirePermissions } from "@/lib/rbac";
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";
import {
  createCommentSchema,
  commentSelect,
  toCommentResponse,
} from "@/lib/validators/comment";

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/v1/complaints/{complaintId}/comments
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/complaints/{complaintId}/comments
 *
 * Returns a paginated list of comments for a complaint, ordered newest first.
 * Requires `complaint:read:all` permission.
 *
 * Query parameters:
 *   - page:     integer (default: 1)
 *   - pageSize: integer (default: 20, max: 100)
 *
 * Responses:
 *   200 – Paginated list of comments
 *   404 – Complaint not found
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ complaintId: string }> },
) {
  const ctx: Record<string, unknown> = {};

  try {
    // ── Authorization ────────────────────────────────────────────────
    const auth = await requirePermissions(request, Permissions.COMPLAINT_READ_ALL);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // ── Extract complaintId ──────────────────────────────────────────
    const { complaintId } = await params;
    ctx.complaintId = complaintId;

    // ── Verify complaint exists ──────────────────────────────────────
    const complaint = await prisma.complaint.findFirst({
      where: { id: complaintId, deletedAt: null },
      select: { id: true },
    });

    if (!complaint) {
      return notFoundResponse("Complaint not found");
    }

    // ── Parse pagination params ──────────────────────────────────────
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20", 10) || 20));
    const skip = (page - 1) * pageSize;

    // ── Fetch comments ───────────────────────────────────────────────
    const [comments, totalItems] = await Promise.all([
      prisma.comment.findMany({
        where: { complaintId },
        select: commentSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.comment.count({ where: { complaintId } }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    logger.info("Comments fetched", {
      ...ctx,
      count: comments.length,
      totalItems,
      page,
    });

    return successResponse(
      comments.map(toCommentResponse),
      { page, pageSize, totalItems, totalPages },
    );
  } catch (error) {
    logger.error("Comments fetch failed", ctx, error);
    return internalErrorResponse("Failed to fetch comments");
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/v1/complaints/{complaintId}/comments
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/complaints/{complaintId}/comments
 *
 * Adds a new comment to a complaint. Creates a timeline event (COMMENT type)
 * and sends a COMMENT notification to the assigned agent and team leads.
 * Requires `complaint:comment` permission.
 *
 * Request body (application/json):
 *   - content:  string (required, 1–2000 chars)
 *   - internal: boolean (optional, default false) — staff-only visibility
 *
 * Responses:
 *   201 – Comment created
 *   404 – Complaint not found
 *   422 – Validation error
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ complaintId: string }> },
) {
  const ctx: Record<string, unknown> = {};

  try {
    // ── Authorization ────────────────────────────────────────────────
    const auth = await requirePermissions(request, Permissions.COMPLAINT_COMMENT);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // ── Extract complaintId ──────────────────────────────────────────
    const { complaintId } = await params;
    ctx.complaintId = complaintId;

    // ── Verify complaint exists and fetch notification targets ────────
    const complaint = await prisma.complaint.findFirst({
      where: { id: complaintId, deletedAt: null },
      select: {
        id: true,
        ticketNumber: true,
        assignedTeamId: true,
        assignedAgentId: true,
        customerId: true,
      },
    });

    if (!complaint) {
      return notFoundResponse("Complaint not found");
    }

    ctx.ticketNumber = complaint.ticketNumber;

    // ── Parse & Validate Body ────────────────────────────────────────
    const body = await request.json();
    const parsed = createCommentSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      return validationErrorResponse(details);
    }

    const { content, internal } = parsed.data;

    // ── Create comment in transaction ─────────────────────────────────
    const comment = await prisma.$transaction(async (tx: any) => {
      // 1. Create the comment
      const created = await tx.comment.create({
        data: {
          complaintId,
          userId: auth.user.userId,
          content,
          isInternal: internal,
        },
        select: commentSelect,
      });

      // 2. Create a timeline event
      await tx.complaintTimeline.create({
        data: {
          complaintId,
          eventType: "COMMENT",
          actorId: auth.user.userId,
          eventData: {
            commentId: created.id,
            internal,
            preview: content.length > 100 ? `${content.slice(0, 100)}...` : content,
          } as any,
        },
      });

      return created;
    });

    // ── Send COMMENT notifications (fire-and-forget) ──────────────────
    const notifications: Array<{
      userId: string;
      title: string;
      message: string;
      type: "COMMENT";
      referenceId: string;
    }> = [];

    const commentPreview = content.length > 120 ? content.slice(0, 120) + "..." : content;

    // Notify assigned agent
    if (complaint.assignedAgentId && complaint.assignedAgentId !== auth.user.userId) {
      notifications.push({
        userId: complaint.assignedAgentId,
        title: "New comment on your complaint",
        message: `New comment on ${complaint.ticketNumber}: ${commentPreview}`,
        type: "COMMENT",
        referenceId: complaintId,
      });
    }

    // Notify team leads
    if (complaint.assignedTeamId) {
      const teamLeads = await prisma.teamMember.findMany({
        where: { teamId: complaint.assignedTeamId, role: "LEAD" },
        select: { userId: true },
      });

      for (const tl of teamLeads) {
        if (tl.userId !== auth.user.userId) {
          notifications.push({
            userId: tl.userId,
            title: "New comment on team complaint",
            message: `New comment on ${complaint.ticketNumber}: ${commentPreview}`,
            type: "COMMENT",
            referenceId: complaintId,
          });
        }
      }
    }

    // Notify the complaint customer (for non-internal comments)
    if (!internal && complaint.customerId && complaint.customerId !== auth.user.userId) {
      notifications.push({
        userId: complaint.customerId,
        title: `Update on ${complaint.ticketNumber}`,
        message: `A new comment was added to your complaint: ${commentPreview}`,
        type: "COMMENT",
        referenceId: complaintId,
      });
    }

    if (notifications.length > 0) {
      prisma.notification.createMany({ data: notifications }).catch((err) => {
        logger.warn("Failed to send comment notifications", { ...ctx }, err);
      });
    }

    logger.info("Comment created", {
      ...ctx,
      commentId: comment.id,
      internal,
      contentLength: content.length,
    });

    return createdResponse(toCommentResponse(comment));
  } catch (error) {
    logger.error("Comment creation failed", ctx, error);
    return internalErrorResponse("Failed to create comment");
  }
}
