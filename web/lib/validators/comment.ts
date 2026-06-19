// =============================================================================
// ResolveX — Comment Validators
// Matches the API-Specifications.yaml Comment schemas
// =============================================================================

import { z } from "zod";

// ── Create Comment Schema ──────────────────────────────────────────────────
// API spec: POST /complaints/{complaintId}/comments
// { content: string, internal?: boolean }

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment must be at most 2000 characters")
    .trim(),
  internal: z.boolean().optional().default(false),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

// ── Comment Response Shape ─────────────────────────────────────────────────

export interface CommentResponse {
  id: string;
  complaintId: string;
  userId: string;
  userName: string;
  content: string;
  internal: boolean;
  createdAt: string;
}

// ── Prisma Select Shape ────────────────────────────────────────────────────

export interface CommentSelectShape {
  id: string;
  complaintId: string;
  userId: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
  user: {
    firstName: string;
    lastName: string;
  };
}

// ── Helper: Map a Prisma Comment row to API response shape ─────────────────

export function toCommentResponse(comment: CommentSelectShape): CommentResponse {
  return {
    id: comment.id,
    complaintId: comment.complaintId,
    userId: comment.userId,
    userName: `${comment.user.firstName} ${comment.user.lastName}`,
    content: comment.content,
    internal: comment.isInternal,
    createdAt: comment.createdAt.toISOString(),
  };
}

// ── Prisma select for reusability ──────────────────────────────────────────

export const commentSelect = {
  id: true,
  complaintId: true,
  userId: true,
  content: true,
  isInternal: true,
  createdAt: true,
  user: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
} as const;
