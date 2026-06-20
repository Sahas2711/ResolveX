// =============================================================================
// ResolveX — Timeline API
// GET /api/v1/complaints/{complaintId}/timeline → Get paginated timeline
// =============================================================================

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/permissions";
import { requirePermissions } from "@/lib/rbac";
import {
  successResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@/lib/response";
import {
  timelineSelect,
  toTimelineEventResponse,
} from "@/lib/validators/timeline";

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/v1/complaints/{complaintId}/timeline
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/complaints/{complaintId}/timeline
 *
 * Returns a paginated, chronological timeline of all activities for a
 * complaint, ordered newest first. Requires `complaint:read:all` (or
 * `complaint:read:own`) permission.
 *
 * Each event includes the event type, actor name, event data, and timestamp.
 *
 * Query parameters:
 *   - page:     integer (default: 1)
 *   - pageSize: integer (default: 20, max: 100)
 *   - eventType: optional filter (e.g. "comment", "status_change")
 *
 * Responses:
 *   200 – Paginated list of timeline events
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

    // ── Parse query params ───────────────────────────────────────────
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20", 10) || 20));
    const eventTypeFilter = url.searchParams.get("eventType");
    const skip = (page - 1) * pageSize;

    // ── Build where clause ───────────────────────────────────────────
    const where: Record<string, unknown> = { complaintId };
    if (eventTypeFilter) {
      // Map API event type to Prisma enum value (uppercase)
      const typeMap: Record<string, string> = {
        status_change: "STATUS_CHANGE",
        assignment: "ASSIGNMENT",
        comment: "COMMENT",
        escalation: "ESCALATION",
        resolution: "RESOLUTION",
        attachment: "ATTACHMENT",
      };
      const prismaType = typeMap[eventTypeFilter];
      if (prismaType) {
        where.eventType = prismaType;
      }
    }

    // ── Fetch timeline events ────────────────────────────────────────
    const [events, totalItems] = await Promise.all([
      prisma.complaintTimeline.findMany({
        where: where as any,
        select: timelineSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.complaintTimeline.count({ where: where as any }),
    ]);

    // ── Resolve actor names ──────────────────────────────────────────
    // Collect unique actor IDs and batch-fetch their names
    const actorIds = [...new Set(events.map((e) => e.actorId))];
    const actors = actorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const actorMap = new Map(actors.map((a) => [a.id, `${a.firstName} ${a.lastName}`]));

    const totalPages = Math.ceil(totalItems / pageSize);

    const data = events.map((event) =>
      toTimelineEventResponse(
        event,
        actorMap.get(event.actorId) ?? "Unknown User",
      ),
    );

    logger.info("Timeline fetched", {
      ...ctx,
      count: data.length,
      totalItems,
      page,
      eventTypeFilter: eventTypeFilter ?? undefined,
    });

    return successResponse(data, { page, pageSize, totalItems, totalPages });
  } catch (error) {
    logger.error("Timeline fetch failed", ctx, error);
    return internalErrorResponse("Failed to fetch timeline");
  }
}
