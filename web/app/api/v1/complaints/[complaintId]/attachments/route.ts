// =============================================================================
// ResolveX — Attachments API
// GET  /api/v1/complaints/{complaintId}/attachments → List attachments
// POST /api/v1/complaints/{complaintId}/attachments → Upload attachment
// =============================================================================

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/permissions";
import { requirePermissions } from "@/lib/rbac";
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  badRequestResponse,
  internalErrorResponse,
} from "@/lib/response";
import {
  attachmentSelect,
  toAttachmentResponse,
} from "@/lib/validators/attachment";
import {
  uploadToCloudinary,
  validateFile,
  MAX_FILE_SIZE,
} from "@/lib/cloudinary";

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/v1/complaints/{complaintId}/attachments
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/complaints/{complaintId}/attachments
 *
 * Returns a list of all attachments for a complaint.
 * Requires `complaint:read:all` permission.
 *
 * Responses:
 *   200 – List of attachments
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

    // ── Fetch attachments ────────────────────────────────────────────
    const attachments = await prisma.attachment.findMany({
      where: { complaintId },
      select: attachmentSelect,
      orderBy: { createdAt: "desc" },
    });

    logger.info("Attachments fetched", {
      ...ctx,
      count: attachments.length,
    });

    return successResponse(attachments.map(toAttachmentResponse));
  } catch (error) {
    logger.error("Attachments fetch failed", ctx, error);
    return internalErrorResponse("Failed to fetch attachments");
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/v1/complaints/{complaintId}/attachments
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/complaints/{complaintId}/attachments
 *
 * Uploads a file attachment to Cloudinary and stores a reference in the
 * database. Creates a timeline event (ATTACHMENT type) and sends a
 * notification to the assigned agent and team leads.
 * Requires `complaint:attachment` permission.
 *
 * Request (multipart/form-data):
 *   - file: File (required, max 10 MB, allowed: jpg, png, pdf, docx)
 *
 * Responses:
 *   201 – Attachment created
 *   400 – Invalid file or missing file
 *   404 – Complaint not found
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ complaintId: string }> },
) {
  const ctx: Record<string, unknown> = {};

  try {
    // ── Authorization ────────────────────────────────────────────────
    const auth = await requirePermissions(request, Permissions.COMPLAINT_ATTACHMENT);
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
        assignedTeamId: true,
        assignedAgentId: true,
        customerId: true,
      },
    });

    if (!complaint) {
      return notFoundResponse("Complaint not found");
    }

    ctx.ticketNumber = complaint.ticketNumber;

    // ── Parse multipart form data ────────────────────────────────────
    const formData = await request.formData();
    const fileField = formData.get("file");

    if (!fileField || !(fileField instanceof File)) {
      return badRequestResponse("No file provided. Upload a file using the 'file' field.");
    }

    const file = fileField as File;

    // ── Validate file ────────────────────────────────────────────────
    const validation = validateFile(file);
    if (!validation.valid) {
      return badRequestResponse(validation.error!);
    }

    // ── Read file buffer ─────────────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // ── Upload to Cloudinary ─────────────────────────────────────────
    const uploadResult = await uploadToCloudinary(
      fileBuffer,
      file.name,
      complaintId,
    );

    // ── Create database record and timeline event in transaction ─────
    const attachment = await prisma.$transaction(async (tx: any) => {
      // 1. Create the attachment record
      const created = await tx.attachment.create({
        data: {
          complaintId,
          uploadedBy: auth.user.userId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          storageUrl: uploadResult.url,
          storagePublicId: uploadResult.publicId,
        },
        select: attachmentSelect,
      });

      // 2. Create a timeline event
      await tx.complaintTimeline.create({
        data: {
          complaintId,
          eventType: "ATTACHMENT",
          actorId: auth.user.userId,
          eventData: {
            attachmentId: created.id,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
          } as any,
        },
      });

      return created;
    });

    // ── Send notifications (fire-and-forget) ─────────────────────────
    const notifications: Array<{
      userId: string;
      title: string;
      message: string;
      type: "COMMENT";
      referenceId: string;
    }> = [];

    const filePreview = file.name.length > 120 ? file.name.slice(0, 120) + "..." : file.name;

    // Notify assigned agent
    if (complaint.assignedAgentId && complaint.assignedAgentId !== auth.user.userId) {
      notifications.push({
        userId: complaint.assignedAgentId,
        title: "New attachment on your complaint",
        message: `New attachment "${filePreview}" on ${complaint.ticketNumber}`,
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
            title: "New attachment on team complaint",
            message: `New attachment "${filePreview}" on ${complaint.ticketNumber}`,
            type: "COMMENT",
            referenceId: complaintId,
          });
        }
      }
    }

    if (notifications.length > 0) {
      prisma.notification.createMany({ data: notifications }).catch((err) => {
        logger.warn("Failed to send attachment notifications", { ...ctx }, err);
      });
    }

    logger.info("Attachment uploaded", {
      ...ctx,
      attachmentId: attachment.id,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    return createdResponse(toAttachmentResponse(attachment));
  } catch (error) {
    logger.error("Attachment upload failed", ctx, error);
    return internalErrorResponse("Failed to upload attachment");
  }
}
