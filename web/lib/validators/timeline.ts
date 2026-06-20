// =============================================================================
// ResolveX — Timeline Validators
// Matches the API-Specifications.yaml TimelineEvent schema
// =============================================================================

import { z } from "zod";

// ── Timeline Event Types ───────────────────────────────────────────────────

export const ApiTimelineEventType = z.enum([
  "status_change",
  "assignment",
  "comment",
  "escalation",
  "resolution",
  "attachment",
]);
export type ApiTimelineEventType = z.infer<typeof ApiTimelineEventType>;

// ── Timeline Event Response Shape ──────────────────────────────────────────

export interface TimelineEventResponse {
  id: string;
  complaintId: string;
  eventType: ApiTimelineEventType;
  actorId: string;
  actorName: string;
  eventData: Record<string, unknown> | null;
  createdAt: string;
}

// ── Prisma Select Shape ────────────────────────────────────────────────────

export interface TimelineSelectShape {
  id: string;
  complaintId: string;
  eventType: string;
  actorId: string;
  eventData: unknown;
  createdAt: Date;
}

// ── Helper: Map Prisma event type to API event type ────────────────────────

function mapPrismaEventTypeToApi(eventType: string): ApiTimelineEventType {
  const map: Record<string, ApiTimelineEventType> = {
    STATUS_CHANGE: "status_change",
    ASSIGNMENT: "assignment",
    COMMENT: "comment",
    ESCALATION: "escalation",
    RESOLUTION: "resolution",
    ATTACHMENT: "attachment",
  };
  return map[eventType] ?? "status_change";
}

// ── Helper: Map a Prisma timeline row to API response shape ───────────────

export function toTimelineEventResponse(
  event: TimelineSelectShape,
  actorName: string,
): TimelineEventResponse {
  return {
    id: event.id,
    complaintId: event.complaintId,
    eventType: mapPrismaEventTypeToApi(event.eventType),
    actorId: event.actorId,
    actorName,
    eventData: event.eventData as Record<string, unknown> | null,
    createdAt: event.createdAt.toISOString(),
  };
}

// ── Prisma select for reusability ──────────────────────────────────────────

export const timelineSelect = {
  id: true,
  complaintId: true,
  eventType: true,
  actorId: true,
  eventData: true,
  createdAt: true,
} as const;
