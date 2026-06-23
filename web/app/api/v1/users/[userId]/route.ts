// =============================================================================
// ResolveX — Users Detail & Mutation API
// GET    /api/v1/users/{userId} → Get user details
// PUT    /api/v1/users/{userId} → Update user (admin)
// DELETE /api/v1/users/{userId} → Soft-delete user (admin)
// =============================================================================

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/permissions";
import { requirePermissions } from "@/lib/rbac";
import {
  successResponse,
  noContentResponse,
  notFoundResponse,
  conflictResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";
import {
  updateUserSchema,
  toUserResponse,
} from "@/lib/validators/user";

// -- Shared: Fetch user by ID -----------------------------------------------

async function findUserOrNull(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      employeeId: true,
      isActive: true,
      status: true,
      profileImageUrl: true,
      createdAt: true,
      updatedAt: true,
      userRoles: {
        select: {
          role: { select: { name: true } },
        },
      },
    },
  });
}

// -- GET: Get User by ID ----------------------------------------------------

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ctx: Record<string, unknown> = {};

  try {
    const auth = await requirePermissions(request, Permissions.USER_READ);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    const { userId } = await params;
    ctx.targetUserId = userId;

    const user = await findUserOrNull(userId);
    if (!user) {
      return notFoundResponse("User not found");
    }

    logger.info("User fetched", ctx);
    return successResponse(toUserResponse(user));
  } catch (error) {
    logger.error("User fetch failed", ctx, error);
    return internalErrorResponse("Failed to fetch user");
  }
}

// -- PUT: Update User -------------------------------------------------------

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ctx: Record<string, unknown> = {};

  try {
    const auth = await requirePermissions(request, Permissions.USER_UPDATE);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    const { userId } = await params;
    ctx.targetUserId = userId;

    const existing = await findUserOrNull(userId);
    if (!existing) {
      return notFoundResponse("User not found");
    }

    // -- Parse & Validate Body ----------------------------------------
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      return validationErrorResponse(details);
    }

    const { name, email, isActive } = parsed.data;

    // -- Check duplicate email (if email is being changed) ------------
    if (email && email !== existing.email) {
      const duplicate = await prisma.user.findFirst({
        where: { email, id: { not: userId }, deletedAt: null },
        select: { id: true },
      });
      if (duplicate) {
        return conflictResponse("A user with this email address already exists");
      }
    }

    // -- Build update payload -----------------------------------------
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      const nameParts = name.trim().split(/\s+/);
      updateData.firstName = nameParts[0]!;
      updateData.lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
    }
    if (email !== undefined) {
      updateData.email = email;
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
      updateData.status = isActive ? "ACTIVE" : "INACTIVE";
    }

    // -- Execute update -----------------------------------------------
    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData as any,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        isActive: true,
        status: true,
        profileImageUrl: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: {
            role: { select: { name: true } },
          },
        },
      },
    });

    logger.info("User updated", {
      ...ctx,
      updatedFields: Object.keys(updateData),
    });

    return successResponse(toUserResponse(updated));
  } catch (error) {
    logger.error("User update failed", ctx, error);
    return internalErrorResponse("Failed to update user");
  }
}

// -- DELETE: Soft-Delete User -----------------------------------------------

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const ctx: Record<string, unknown> = {};

  try {
    const auth = await requirePermissions(request, Permissions.USER_DELETE);
    if (!auth.allowed) return auth.response;
    ctx.userId = auth.user.userId;

    const { userId } = await params;
    ctx.targetUserId = userId;

    const existing = await findUserOrNull(userId);
    if (!existing) {
      return notFoundResponse("User not found");
    }

    // Prevent deleting yourself
    if (userId === ctx.userId) {
      return conflictResponse("You cannot delete your own account");
    }

    // -- Soft-delete --------------------------------------------------
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        isActive: false,
        status: "INACTIVE",
      },
    });

    logger.info("User soft-deleted", {
      ...ctx,
      deletedUser: existing.email,
    });

    return noContentResponse();
  } catch (error) {
    logger.error("User deletion failed", ctx, error);
    return internalErrorResponse("Failed to delete user");
  }
}
