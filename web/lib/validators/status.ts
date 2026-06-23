// =============================================================================
// ResolveX — Status Transition Validators
// =============================================================================

import { z } from "zod";

// -- General Status Transition ----------------------------------------------
// POST /complaints/{complaintId}/status
// Body: { transitionId: string, remarks?: string }

export const statusTransitionSchema = z.object({
  /** The transition ID (e.g., "start", "wait", "resume") */
  transitionId: z
    .string()
    .min(1, "Transition ID is required")
    .max(50, "Transition ID too long"),
  /** Optional remarks/reason for the transition */
  remarks: z
    .string()
    .max(2000, "Remarks must be at most 2000 characters")
    .trim()
    .optional(),
});

export type StatusTransitionInput = z.infer<typeof statusTransitionSchema>;

// -- Resolve Complaint -----------------------------------------------------
// POST /complaints/{complaintId}/resolve
// Body: { resolutionSummary: string }

export const resolveComplaintSchema = z.object({
  resolutionSummary: z
    .string()
    .min(20, "Resolution summary must be at least 20 characters")
    .max(2000, "Resolution summary must be at most 2000 characters")
    .trim(),
});

export type ResolveComplaintInput = z.infer<typeof resolveComplaintSchema>;

// -- Close Complaint -------------------------------------------------------
// POST /complaints/{complaintId}/close
// Body: { closureNotes?: string }

export const closeComplaintSchema = z.object({
  closureNotes: z
    .string()
    .max(500, "Closure notes must be at most 500 characters")
    .trim()
    .optional(),
});

export type CloseComplaintInput = z.infer<typeof closeComplaintSchema>;

// -- Reopen Complaint ------------------------------------------------------
// POST /complaints/{complaintId}/reopen
// Body: { reason: string }

export const reopenComplaintSchema = z.object({
  reason: z
    .string()
    .min(10, "Reason must be at least 10 characters")
    .max(500, "Reason must be at most 500 characters")
    .trim(),
});

export type ReopenComplaintInput = z.infer<typeof reopenComplaintSchema>;

// -- Escalate Complaint ----------------------------------------------------
// POST /complaints/{complaintId}/escalate
// Body: { reason: string, escalationLevel?: string }

export const escalateComplaintSchema = z.object({
  reason: z
    .string()
    .min(10, "Escalation reason must be at least 10 characters")
    .max(500, "Escalation reason must be at most 500 characters")
    .trim(),
  escalationLevel: z
    .enum(["L1", "L2", "L3", "MANAGEMENT"])
    .optional()
    .default("L1"),
});

export type EscalateComplaintInput = z.infer<typeof escalateComplaintSchema>;
