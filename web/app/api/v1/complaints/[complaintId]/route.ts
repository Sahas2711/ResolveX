// =============================================================================
// ResolveX — Complaint Detail API
// GET  /api/v1/complaints/{complaintId} → Get complaint details
// PUT  /api/v1/complaints/{complaintId} → Update complaint fields
// =============================================================================

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/permissions";
import { requirePermissions } from "@/lib/rbac";
import {
  successResponse,
  notFoundResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";
import {
  updateComplaintSchema,
  mapApiPriorityToPrisma,
  mapApiSeverityToPrisma,
  mapPrismaPriorityToApi,
  mapPrismaSeverityToApi,
  complaintSelect,
  toComplaintResponse,
} from "@/lib/validators/complaint";

// -- Shared: Fetch complaint by ID ------------------------------------------

async function findComplaintOrNull(complaintId: string) {
  return prisma.complaint.findFirst({
    where: { id: complaintId, deletedAt: null },
    select: complaintSelect,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/v1/complaints/{complaintId}
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/complaints/{complaintId}
 *
 * Returns full complaint details. Requires `complaint:read:all` permission.
 * Returns 404 if the complaint does not exist or has been deleted.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ complaintId: string }> },
) {
  const ctx: Record<string, unknown> = {};

  try {
    const auth = await requirePermissions(request, Permissions.COMPLAINT_READ_ALL);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    const { complaintId } = await params;
    ctx.complaintId = complaintId;

    const complaint = await findComplaintOrNull(complaintId);

    if (!complaint) {
      return notFoundResponse("Complaint not found");
    }

    logger.info("Complaint fetched", ctx);
    return successResponse(toComplaintResponse(complaint));
  } catch (error) {
    logger.error("Complaint fetch failed", ctx, error);
    return internalErrorResponse("Failed to fetch complaint");
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PUT /api/v1/complaints/{complaintId}
// ═══════════════════════════════════════════════════════════════════════════

/**
 * PUT /api/v1/complaints/{complaintId}
 *
 * Updates one or more complaint fields. All fields are optional — only
 * provided fields are updated. Requires `complaint:update` permission.
 *
 * Request body (application/json):
 *   - priority:    "low" | "medium" | "high" | "critical" (optional)
 *   - severity:    "minor" | "major" | "critical" (optional)
 *   - description: string (optional, 20–5000 chars)
 *   - category:    string (optional, complaint category name)
 *
 * Responses:
 *   200 – Complaint updated
 *   404 – Complaint or category not found
 *   422 – Validation error
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ complaintId: string }> },
) {
  const ctx: Record<string, unknown> = {};

  try {
    // -- Authorization ------------------------------------------------
    const auth = await requirePermissions(request, Permissions.COMPLAINT_UPDATE);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    // -- Extract complaintId ------------------------------------------
    const { complaintId } = await params;
    ctx.complaintId = complaintId;

    // -- Verify complaint exists --------------------------------------
    const existing = await findComplaintOrNull(complaintId);
    if (!existing) {
      return notFoundResponse("Complaint not found");
    }

    // -- Parse & Validate Body ----------------------------------------
    const body = await request.json();
    const parsed = updateComplaintSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      return validationErrorResponse(details);
    }

    const { priority, severity, description, category: categoryName } = parsed.data;

    // -- Validate: at least one field must be provided -----------------
    if (!priority && !severity && !description && !categoryName) {
      return validationErrorResponse([
        {
          field: "body",
          message:
            "At least one field (priority, severity, description, category) must be provided",
          constraint: "min_fields",
        },
      ]);
    }

    // -- Build update payload ------------------------------------------
    const updateData: Record<string, unknown> = {};

    if (priority) {
      updateData.priority = mapApiPriorityToPrisma(priority);
    }

    if (severity) {
      updateData.severity = mapApiSeverityToPrisma(severity);
    }

    if (description) {
      updateData.description = description;
    }

    if (categoryName) {
      // Look up the category by name
      const category = await prisma.complaintCategory.findFirst({
        where: {
          name: { equals: categoryName, mode: "insensitive" },
          OR: [
            { productId: existing.product.id },
            { productId: null },
          ],
        },
        select: { id: true, name: true },
      });

      if (!category) {
        return notFoundResponse(
          `Category "${categoryName}" not found for this product`,
        );
      }

      updateData.categoryId = category.id;
      updateData.title = categoryName;
    }

    // ── Build changes object for timeline event ───────────────────────
    const changes: Record<string, { from: string; to: string }> = {};

    if (priority) {
      changes.priority = {
        from: mapPrismaPriorityToApi(existing.priority),
        to: priority,
      };
    }

    if (severity) {
      changes.severity = {
        from: mapPrismaSeverityToApi(existing.severity),
        to: severity,
      };
    }

    if (description) {
      changes.description = {
        from: "[previous]",
        to: "[updated]",
      };
    }

    if (categoryName) {
      changes.category = {
        from: existing.title,
        to: categoryName,
      };
    }

    // ── Update the complaint and create timeline event in transaction ───
    const updated = await prisma.$transaction(async (tx: any) => {
      const result = await tx.complaint.update({
        where: { id: complaintId },
        data: updateData as any,
        select: complaintSelect,
      });

      await tx.complaintTimeline.create({
        data: {
          complaintId,
          eventType: "UPDATE",
          actorId: auth.user.userId,
          eventData: { changes } as any,
        },
      });

      return result;
    });

    logger.info("Complaint updated", {
      ...ctx,
      ticketNumber: updated.ticketNumber,
      updatedFields: Object.keys(updateData),
      changes,
    });

    return successResponse(toComplaintResponse(updated));
  } catch (error) {
    logger.error("Complaint update failed", ctx, error);
    return internalErrorResponse("Failed to update complaint");
  }
}
