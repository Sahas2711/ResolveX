// =============================================================================
// ResolveX — Complaint Validators
// Matches the API-Specifications.yaml Complaint schemas
// =============================================================================

import { z } from "zod";

// ── API Enum Mappings ──────────────────────────────────────────────────────
// API spec uses lowercase enums; Prisma uses UPPERCASE enums.
// Severity mapping is slightly different: API has [minor, major, critical]
// while Prisma has [LOW, MEDIUM, HIGH, SEVERE].

export const ApiPriority = z.enum(["low", "medium", "high", "critical"]);
export type ApiPriority = z.infer<typeof ApiPriority>;

export const ApiSeverity = z.enum(["minor", "major", "critical"]);
export type ApiSeverity = z.infer<typeof ApiSeverity>;

export const ApiComplaintStatus = z.enum([
  "open", "assigned", "in_progress", "waiting_for_customer",
  "resolved", "reopened", "closed", "escalated",
]);
export type ApiComplaintStatus = z.infer<typeof ApiComplaintStatus>;

// ── Mapping functions ─────────────────────────────────────────────────────

export function mapApiPriorityToPrisma(
  priority: ApiPriority,
): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  const map: Record<ApiPriority, "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"> = {
    low: "LOW",
    medium: "MEDIUM",
    high: "HIGH",
    critical: "CRITICAL",
  };
  return map[priority];
}

export function mapPrismaPriorityToApi(
  priority: string,
): ApiPriority {
  const map: Record<string, ApiPriority> = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    CRITICAL: "critical",
  };
  return map[priority] ?? "low";
}

export function mapApiSeverityToPrisma(
  severity: ApiSeverity,
): "LOW" | "MEDIUM" | "HIGH" | "SEVERE" {
  const map: Record<ApiSeverity, "LOW" | "MEDIUM" | "HIGH" | "SEVERE"> = {
    minor: "LOW",
    major: "MEDIUM",
    critical: "HIGH",
  };
  return map[severity];
}

export function mapPrismaSeverityToApi(
  severity: string,
): ApiSeverity {
  const map: Record<string, ApiSeverity> = {
    LOW: "minor",
    MEDIUM: "major",
    HIGH: "critical",
    SEVERE: "critical",
  };
  return map[severity] ?? "minor";
}

export function mapPrismaStatusToApi(
  status: string,
): ApiComplaintStatus {
  const map: Record<string, ApiComplaintStatus> = {
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

// ── Create Complaint Schema ────────────────────────────────────────────────
// API spec: POST /complaints
// { productId: uuid, category: string, priority: enum, severity: enum, description: string }

export const createComplaintSchema = z.object({
  productId: z.string().uuid("Invalid product ID format"),
  category: z
    .string()
    .min(1, "Category is required")
    .max(100, "Category must be at most 100 characters")
    .trim(),
  priority: ApiPriority,
  severity: ApiSeverity,
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(5000, "Description must be at most 5000 characters")
    .trim(),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;

// ── Complaint Response Shape (matches API spec Complaint schema) ───────────

export interface ComplaintResponse {
  id: string;
  ticketNumber: string;
  userId: string;
  product: { id: string; name: string };
  category: string;
  priority: ApiPriority;
  severity: ApiSeverity;
  description: string;
  assignedTeam: { id: string; name: string } | null;
  assignedStaff: { id: string; name: string } | null;
  currentStatus: ApiComplaintStatus;
  resolutionNotes: string | null;
  slaFirstResponseDeadline: string | null;
  slaResolutionDeadline: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

// ── Prisma Select Shape ────────────────────────────────────────────────────

export interface ComplaintSelectShape {
  id: string;
  ticketNumber: string;
  customerId: string;
  title: string;
  description: string;
  priority: string;
  severity: string;
  currentStatus: string;
  resolutionSummary: string | null;
  slaFirstResponseDeadline: Date | null;
  slaResolutionDeadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  product: {
    id: string;
    productName: string;
  };
  assignedTeam: {
    id: string;
    teamName: string;
  } | null;
  assignedAgent: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

// ── Helper: Map a Prisma Complaint row to API response shape ───────────────

export function toComplaintResponse(
  complaint: ComplaintSelectShape,
): ComplaintResponse {
  return {
    id: complaint.id,
    ticketNumber: complaint.ticketNumber,
    userId: complaint.customerId,
    product: {
      id: complaint.product.id,
      name: complaint.product.productName,
    },
    category: complaint.title,
    priority: mapPrismaPriorityToApi(complaint.priority),
    severity: mapPrismaSeverityToApi(complaint.severity),
    description: complaint.description,
    assignedTeam: complaint.assignedTeam
      ? { id: complaint.assignedTeam.id, name: complaint.assignedTeam.teamName }
      : null,
    assignedStaff: complaint.assignedAgent
      ? {
          id: complaint.assignedAgent.id,
          name: `${complaint.assignedAgent.firstName} ${complaint.assignedAgent.lastName}`,
        }
      : null,
    currentStatus: mapPrismaStatusToApi(complaint.currentStatus),
    resolutionNotes: complaint.resolutionSummary,
    slaFirstResponseDeadline: complaint.slaFirstResponseDeadline?.toISOString() ?? null,
    slaResolutionDeadline: complaint.slaResolutionDeadline?.toISOString() ?? null,
    createdAt: complaint.createdAt.toISOString(),
    updatedAt: complaint.updatedAt.toISOString(),
    closedAt: complaint.closedAt?.toISOString() ?? null,
  };
}

// ── Prisma select for reusability ──────────────────────────────────────────

export const complaintSelect = {
  id: true,
  ticketNumber: true,
  customerId: true,
  title: true,
  description: true,
  priority: true,
  severity: true,
  currentStatus: true,
  resolutionSummary: true,
  slaFirstResponseDeadline: true,
  slaResolutionDeadline: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
  product: {
    select: {
      id: true,
      productName: true,
    },
  },
  assignedTeam: {
    select: {
      id: true,
      teamName: true,
    },
  },
  assignedAgent: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} as const;
