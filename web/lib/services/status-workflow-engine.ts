// =============================================================================
// ResolveX — Complaint Status Workflow Engine
//
// Encapsulates all status transition logic, validation, history tracking,
// timeline events, and notifications. Every status change goes through here.
//
// Valid transitions:
//   OPEN          → ASSIGNED        (via auto-assign / manual assign)
//   ASSIGNED      → IN_PROGRESS     (agent starts work)
//   IN_PROGRESS   → WAITING_CUSTOMER (agent needs info)
//   WAITING_CUSTOMER → IN_PROGRESS   (customer replied)
//   IN_PROGRESS   → RESOLVED        (agent submits resolution)
//   RESOLVED      → CLOSED          (admin/lead confirms)
//   RESOLVED      → REOPENED        (issue persists)
//   CLOSED        → REOPENED        (reopen for any reason)
//   *             → ESCALATED       (any status → escalate)
//   REOPENED      → ASSIGNED        (reassigned after reopen)
//   REOPENED      → IN_PROGRESS     (agent resumes work)
// =============================================================================

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/permissions";

// ── Types ──────────────────────────────────────────────────────────────────

/** Prisma ComplaintStatus enum values */
export type PrismaComplaintStatus =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "WAITING_CUSTOMER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "ESCALATED";

export const PRISMA_STATUSES: PrismaComplaintStatus[] = [
  "OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER",
  "RESOLVED", "CLOSED", "REOPENED", "ESCALATED",
];

/** Mapping from Prisma status to API (lowercase) status */
export function toApiStatus(status: string): string {
  const map: Record<string, string> = {
    OPEN: "open",
    ASSIGNED: "assigned",
    IN_PROGRESS: "in_progress",
    WAITING_CUSTOMER: "waiting_for_customer",
    RESOLVED: "resolved",
    CLOSED: "closed",
    REOPENED: "reopened",
    ESCALATED: "escalated",
  };
  return map[status] ?? "open";
}

/** Mapping from API status to Prisma (uppercase) status */
export function toPrismaStatus(status: string): PrismaComplaintStatus | null {
  const map: Record<string, PrismaComplaintStatus> = {
    open: "OPEN",
    assigned: "ASSIGNED",
    in_progress: "IN_PROGRESS",
    waiting_for_customer: "WAITING_CUSTOMER",
    resolved: "RESOLVED",
    closed: "CLOSED",
    reopened: "REOPENED",
    escalated: "ESCALATED",
  };
  return map[status] ?? null;
}

// ── Transition Definitions ─────────────────────────────────────────────────

interface TransitionDef {
  /** The target Prisma status */
  to: PrismaComplaintStatus;
  /** Human-readable label for the action */
  action: string;
  /** Permission key required to perform this transition */
  permission: string;
  /** Whether a remarks/reason string is required */
  remarksRequired: boolean;
  /** Optional: label for the remarks field */
  remarksLabel?: string;
  /** Optional: max length for remarks */
  remarksMaxLength?: number;
  /** Description shown in UI tooltip */
  description: string;
}

/** All valid transitions from a given status, keyed by a transition ID */
export const TRANSITION_MAP: Record<PrismaComplaintStatus, Record<string, TransitionDef>> = {
  OPEN: {
    assign: {
      to: "ASSIGNED",
      action: "Assign",
      permission: Permissions.COMPLAINT_REASSIGN,
      remarksRequired: false,
      description: "Assign complaint to a team/agent",
    },
    escalate: {
      to: "ESCALATED",
      action: "Escalate",
      permission: Permissions.COMPLAINT_ESCALATE,
      remarksRequired: true,
      remarksLabel: "Escalation reason",
      remarksMaxLength: 500,
      description: "Escalate this complaint to a higher level",
    },
  },

  ASSIGNED: {
    start: {
      to: "IN_PROGRESS",
      action: "Start Work",
      permission: Permissions.COMPLAINT_UPDATE_STATUS,
      remarksRequired: false,
      description: "Begin working on this complaint",
    },
    escalate: {
      to: "ESCALATED",
      action: "Escalate",
      permission: Permissions.COMPLAINT_ESCALATE,
      remarksRequired: true,
      remarksLabel: "Escalation reason",
      remarksMaxLength: 500,
      description: "Escalate this complaint to a higher level",
    },
  },

  IN_PROGRESS: {
    wait: {
      to: "WAITING_CUSTOMER",
      action: "Wait for Customer",
      permission: Permissions.COMPLAINT_UPDATE_STATUS,
      remarksRequired: true,
      remarksLabel: "Information needed",
      remarksMaxLength: 500,
      description: "Mark as waiting for customer response",
    },
    resolve: {
      to: "RESOLVED",
      action: "Resolve",
      permission: Permissions.COMPLAINT_RESOLVE,
      remarksRequired: true,
      remarksLabel: "Resolution summary",
      remarksMaxLength: 2000,
      description: "Submit resolution for this complaint",
    },
    escalate: {
      to: "ESCALATED",
      action: "Escalate",
      permission: Permissions.COMPLAINT_ESCALATE,
      remarksRequired: true,
      remarksLabel: "Escalation reason",
      remarksMaxLength: 500,
      description: "Escalate this complaint to a higher level",
    },
  },

  WAITING_CUSTOMER: {
    resume: {
      to: "IN_PROGRESS",
      action: "Resume Work",
      permission: Permissions.COMPLAINT_UPDATE_STATUS,
      remarksRequired: false,
      description: "Customer has responded, resume working",
    },
    escalate: {
      to: "ESCALATED",
      action: "Escalate",
      permission: Permissions.COMPLAINT_ESCALATE,
      remarksRequired: true,
      remarksLabel: "Escalation reason",
      remarksMaxLength: 500,
      description: "Escalate this complaint to a higher level",
    },
  },

  RESOLVED: {
    close: {
      to: "CLOSED",
      action: "Close",
      permission: Permissions.COMPLAINT_CLOSE,
      remarksRequired: true,
      remarksLabel: "Closure notes",
      remarksMaxLength: 500,
      description: "Confirm and close this resolved complaint",
    },
    reopen: {
      to: "REOPENED",
      action: "Reopen",
      permission: Permissions.COMPLAINT_REOPEN,
      remarksRequired: true,
      remarksLabel: "Reason for reopening",
      remarksMaxLength: 500,
      description: "Reopen complaint — issue persists",
    },
    escalate: {
      to: "ESCALATED",
      action: "Escalate",
      permission: Permissions.COMPLAINT_ESCALATE,
      remarksRequired: true,
      remarksLabel: "Escalation reason",
      remarksMaxLength: 500,
      description: "Escalate this complaint to a higher level",
    },
  },

  CLOSED: {
    reopen: {
      to: "REOPENED",
      action: "Reopen",
      permission: Permissions.COMPLAINT_REOPEN,
      remarksRequired: true,
      remarksLabel: "Reason for reopening",
      remarksMaxLength: 500,
      description: "Reopen complaint",
    },
    escalate: {
      to: "ESCALATED",
      action: "Escalate",
      permission: Permissions.COMPLAINT_ESCALATE,
      remarksRequired: true,
      remarksLabel: "Escalation reason",
      remarksMaxLength: 500,
      description: "Escalate this complaint to a higher level",
    },
  },

  REOPENED: {
    assign: {
      to: "ASSIGNED",
      action: "Assign",
      permission: Permissions.COMPLAINT_REASSIGN,
      remarksRequired: false,
      description: "Reassign reopened complaint",
    },
    start: {
      to: "IN_PROGRESS",
      action: "Resume Work",
      permission: Permissions.COMPLAINT_UPDATE_STATUS,
      remarksRequired: false,
      description: "Resume working on reopened complaint",
    },
    escalate: {
      to: "ESCALATED",
      action: "Escalate",
      permission: Permissions.COMPLAINT_ESCALATE,
      remarksRequired: true,
      remarksLabel: "Escalation reason",
      remarksMaxLength: 500,
      description: "Escalate this complaint to a higher level",
    },
  },

  ESCALATED: {
    // Escalation handler can reassign or resume
    assign: {
      to: "ASSIGNED",
      action: "Reassign",
      permission: Permissions.COMPLAINT_REASSIGN,
      remarksRequired: true,
      remarksLabel: "Reassignment notes",
      remarksMaxLength: 500,
      description: "Reassign escalated complaint",
    },
    start: {
      to: "IN_PROGRESS",
      action: "Resume Work",
      permission: Permissions.COMPLAINT_UPDATE_STATUS,
      remarksRequired: true,
      remarksLabel: "Resolution notes",
      remarksMaxLength: 500,
      description: "Begin working on escalated complaint",
    },
  },
};

/** Describes an available transition for the UI */
export interface AvailableTransition {
  id: string;
  to: string;
  action: string;
  remarksRequired: boolean;
  remarksLabel: string;
  remarksMaxLength: number;
  description: string;
}

/**
 * Returns the list of available transitions for a given status,
 * filtered by the user's permissions.
 */
export function getAvailableTransitions(
  currentStatus: string,
  userPermissions: string[],
): AvailableTransition[] {
  const transitions = TRANSITION_MAP[currentStatus as PrismaComplaintStatus];
  if (!transitions) return [];

  return Object.entries(transitions)
    .filter(([_, def]) => userPermissions.includes(def.permission))
    .map(([id, def]) => ({
      id,
      to: toApiStatus(def.to),
      action: def.action,
      remarksRequired: def.remarksRequired,
      remarksLabel: def.remarksLabel ?? "Remarks",
      remarksMaxLength: def.remarksMaxLength ?? 500,
      description: def.description,
    }));
}

/**
 * Validates that a transition is allowed from the current status.
 * Returns the transition definition if valid, or null if invalid.
 */
export function validateTransition(
  currentStatus: string,
  transitionId: string,
): TransitionDef | null {
  const fromTransitions = TRANSITION_MAP[currentStatus as PrismaComplaintStatus];
  if (!fromTransitions) return null;
  return fromTransitions[transitionId] ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSITION EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

export interface TransitionResult {
  complaintId: string;
  oldStatus: PrismaComplaintStatus;
  newStatus: PrismaComplaintStatus;
}

export interface ExecuteTransitionOptions {
  complaintId: string;
  currentStatus: string;
  transitionId: string;
  actorId: string;
  remarks?: string;
}

/**
 * Executes a validated status transition within a Prisma transaction.
 * Returns the old and new status for response building.
 *
 * This function is meant to be called inside an existing transaction,
 * so it takes a transaction client (`tx`) rather than the top-level prisma.
 */
export async function executeTransition(
  tx: any,
  options: ExecuteTransitionOptions,
): Promise<TransitionResult> {
  const { complaintId, currentStatus, transitionId, actorId, remarks } = options;

  const def = validateTransition(currentStatus, transitionId);
  if (!def) {
    throw new Error(
      `Invalid transition: "${transitionId}" from status "${currentStatus}"`,
    );
  }

  const oldStatus = currentStatus as PrismaComplaintStatus;
  const newStatus = def.to;

  // ── Build update payload ──────────────────────────────────────────────
  const updateData: Record<string, unknown> = {
    currentStatus: newStatus,
  };

  // Set resolvedAt when transitioning to RESOLVED
  if (newStatus === "RESOLVED") {
    updateData.resolvedAt = new Date();
  }

  // Clear resolvedAt when leaving RESOLVED
  if (oldStatus === "RESOLVED" && newStatus !== "RESOLVED") {
    updateData.resolvedAt = null;
  }

  // Set closedAt when transitioning to CLOSED
  if (newStatus === "CLOSED") {
    updateData.closedAt = new Date();
  }

  // Clear closedAt when leaving CLOSED or REOPENED from CLOSED
  if (oldStatus === "CLOSED" && newStatus !== "CLOSED") {
    updateData.closedAt = null;
  }

  // Store resolution summary if provided with resolution
  if (newStatus === "RESOLVED" && remarks) {
    updateData.resolutionSummary = remarks;
  }

  // ── 1. Update the complaint status ────────────────────────────────────
  await tx.complaint.update({
    where: { id: complaintId },
    data: updateData,
  });

  // ── 2. Create status history record ───────────────────────────────────
  await tx.complaintStatusHistory.create({
    data: {
      complaintId,
      oldStatus,
      newStatus,
      changedBy: actorId,
      remarks: remarks ?? null,
    },
  });

  // ── 3. Create timeline event ──────────────────────────────────────────
  const eventType = determineEventType(oldStatus, newStatus);
  await tx.complaintTimeline.create({
    data: {
      complaintId,
      eventType,
      actorId,
      eventData: {
        from: toApiStatus(oldStatus),
        to: toApiStatus(newStatus),
        description: remarks ?? null,
        transitionId,
      } as any,
    },
  });

  return { complaintId, oldStatus, newStatus };
}

/**
 * Determines the appropriate TimelineEventType based on the status change.
 */
function determineEventType(
  oldStatus: PrismaComplaintStatus,
  newStatus: PrismaComplaintStatus,
): "STATUS_CHANGE" | "RESOLUTION" | "ESCALATION" {
  if (newStatus === "RESOLVED") return "RESOLUTION";
  if (newStatus === "ESCALATED") return "ESCALATION";
  return "STATUS_CHANGE";
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION HELPER
// ═══════════════════════════════════════════════════════════════════════════

export interface StatusNotification {
  userId: string;
  title: string;
  message: string;
  type: "ASSIGNMENT" | "ESCALATION" | "RESOLUTION";
  referenceId: string;
}

/**
 * Builds notifications for a status transition.
 * Different transition types notify different stakeholders.
 */
export async function buildStatusNotifications(
  complaintId: string,
  ticketNumber: string,
  productId: string,
  oldStatus: string,
  newStatus: string,
  transitionId: string,
  remarks?: string,
): Promise<StatusNotification[]> {
  const notifications: StatusNotification[] = [];

  // ── Resolution notifications ───────────────────────────────────────
  if (newStatus === "RESOLVED") {
    // Notify team leads that resolution is submitted
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: {
        assignedTeamId: true,
        customerId: true,
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (complaint?.assignedTeamId) {
      const teamLeads = await prisma.teamMember.findMany({
        where: { teamId: complaint.assignedTeamId, role: "LEAD" },
        select: { userId: true },
      });
      for (const tl of teamLeads) {
        notifications.push({
          userId: tl.userId,
          title: "Complaint resolved",
          message: `Complaint ${ticketNumber} has been resolved.${remarks ? ` Notes: ${remarks}` : ""}`,
          type: "RESOLUTION",
          referenceId: complaintId,
        });
      }
    }

    // Notify the customer
    if (complaint?.customerId) {
      notifications.push({
        userId: complaint.customerId,
        title: "Your complaint has been resolved",
        message: `Complaint ${ticketNumber} has been resolved.${remarks ? ` Resolution: ${remarks}` : ""}`,
        type: "RESOLUTION",
        referenceId: complaintId,
      });
    }
  }

  // ── Escalation notifications ────────────────────────────────────────
  if (newStatus === "ESCALATED") {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { customerId: true, assignedTeamId: true },
    });

    // Notify product managers / admin via team leads of escalation
    if (complaint?.assignedTeamId) {
      const leads = await prisma.teamMember.findMany({
        where: { teamId: complaint.assignedTeamId, role: "LEAD" },
        select: { userId: true },
      });
      for (const l of leads) {
        notifications.push({
          userId: l.userId,
          title: "Complaint escalated",
          message: `Complaint ${ticketNumber} has been escalated.${remarks ? ` Reason: ${remarks}` : ""}`,
          type: "ESCALATION",
          referenceId: complaintId,
        });
      }
    }

    // Notify customer
    if (complaint?.customerId) {
      notifications.push({
        userId: complaint.customerId,
        title: "Your complaint has been escalated",
        message: `Complaint ${ticketNumber} has been escalated for priority handling.`,
        type: "ESCALATION",
        referenceId: complaintId,
      });
    }
  }

  return notifications;
}
