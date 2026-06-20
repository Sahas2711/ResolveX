// =============================================================================
// ResolveX — Attachment Validators
// Matches the API-Specifications.yaml Attachment schema
// =============================================================================

import { z } from "zod";

// ── Attachment Response Shape (matches API spec) ───────────────────────────

export interface AttachmentResponse {
  id: string;
  complaintId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
}

// ── Prisma Select Shape ────────────────────────────────────────────────────

export interface AttachmentSelectShape {
  id: string;
  complaintId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageUrl: string;
  storagePublicId: string | null;
  uploadedBy: string;
  createdAt: Date;
  uploadedByUser: {
    firstName: string;
    lastName: string;
  };
}

// ── Helper: Map a Prisma Attachment row to API response shape ──────────────

export function toAttachmentResponse(
  attachment: AttachmentSelectShape,
): AttachmentResponse {
  return {
    id: attachment.id,
    complaintId: attachment.complaintId,
    fileName: attachment.fileName,
    fileType: attachment.fileType,
    fileSize: attachment.fileSize,
    fileUrl: attachment.storageUrl,
    uploadedBy: attachment.uploadedBy,
    uploadedByName: `${attachment.uploadedByUser.firstName} ${attachment.uploadedByUser.lastName}`,
    createdAt: attachment.createdAt.toISOString(),
  };
}

// ── Prisma select for reusability ──────────────────────────────────────────

export const attachmentSelect = {
  id: true,
  complaintId: true,
  fileName: true,
  fileType: true,
  fileSize: true,
  storageUrl: true,
  storagePublicId: true,
  uploadedBy: true,
  createdAt: true,
  uploadedByUser: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
} as const;
