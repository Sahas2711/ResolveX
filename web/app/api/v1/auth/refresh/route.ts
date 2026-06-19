import prisma from "@/lib/prisma";
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";
import { refreshTokenSchema } from "@/lib/validators";
import {
  hashToken,
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  type JwtUserPayload,
} from "@/lib/auth";
import { logger, getClientIp } from "@/lib/logger";

/**
 * POST /api/v1/auth/refresh
 *
 * Exchange a refresh token for a new access token (and a new refresh token).
 * Implements token rotation: the old refresh token is revoked and a new one
 * is issued. This prevents replay attacks if a token is compromised.
 *
 * Flow:
 * 1. Verify the JWT signature of the incoming refresh token
 * 2. Hash the token and look it up in the database
 * 3. Ensure it is not revoked and has not expired
 * 4. Revoke the old token (rotation)
 * 5. Issue new access + refresh tokens
 * 6. Persist the new refresh token
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const ctx = { ip };

  try {
    // ── Parse & Validate Body ────────────────────────────────────────
    const body = await request.json();
    const parsed = refreshTokenSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      logger.warn("Refresh token validation failed", { ...ctx, details });
      return validationErrorResponse(details);
    }

    const { refreshToken: rawToken } = parsed.data;

    // ── 1. Verify JWT signature ─────────────────────────────────────
    let tokenPayload: { sub: string };
    try {
      tokenPayload = await verifyRefreshToken(rawToken);
    } catch {
      logger.warn("Refresh failed: invalid JWT signature", ctx);
      return unauthorizedResponse("Invalid or expired refresh token");
    }

    const userId = tokenPayload.sub;

    // ── 2. Hash token & find in DB ──────────────────────────────────
    const tokenHash = hashToken(rawToken);

    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        userId,
      },
      select: {
        id: true,
        revoked: true,
        expiresAt: true,
      },
    });

    if (!storedToken) {
      logger.warn("Refresh failed: token not found in DB", {
        ...ctx,
        userId,
      });
      return unauthorizedResponse("Invalid refresh token");
    }

    if (storedToken.revoked) {
      // ── Token reuse detected! Revoke ALL tokens for this user ─────
      // If a revoked token is presented, it likely means the token was
      // stolen. As a security measure, revoke every refresh token for
      // this user to force re-authentication.
      logger.warn("Refresh token reuse detected — revoking all tokens", {
        ...ctx,
        userId,
      });

      await prisma.refreshToken.updateMany({
        where: { userId },
        data: { revoked: true },
      });

      return unauthorizedResponse(
        "Refresh token has been revoked. Please log in again."
      );
    }

    // ── Check expiry ────────────────────────────────────────────────
    if (storedToken.expiresAt < new Date()) {
      logger.warn("Refresh failed: token expired", { ...ctx, userId });
      return unauthorizedResponse("Refresh token has expired. Please log in again.");
    }

    // ── 3. Fetch user with roles ────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        isActive: true,
        status: true,
        userRoles: {
          select: {
            role: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!user || !user.isActive || user.status !== "ACTIVE") {
      logger.info("Refresh failed: account inactive or deleted", {
        ...ctx,
        userId,
      });
      return unauthorizedResponse("Account is inactive. Please contact support.");
    }

    // ── 4. Revoke old token & issue new ones (atomic) ───────────────
    const roleIds = user.userRoles.map((ur: { role: { id: string } }) => ur.role.id);

    const jwtPayload: JwtUserPayload = {
      sub: user.id,
      email: user.email,
      roleIds,
    };

    const newAccessToken = await generateAccessToken(jwtPayload);
    const newRefreshToken = await generateRefreshToken(user.id);
    const newTokenHash = hashToken(newRefreshToken);
    const newTokenExpiry = getRefreshTokenExpiry();

    await prisma.$transaction(async (tx: { refreshToken: { update: (args: any) => Promise<any>; create: (args: any) => Promise<any> } }) => {
      // Revoke the old token (rotation)
      await tx.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked: true },
      });

      // Persist the new token
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newTokenHash,
          expiresAt: newTokenExpiry,
          revoked: false,
        },
      });
    });

    logger.info("Token refresh successful", {
      ...ctx,
      userId: user.id,
      email: user.email,
    });

    // ── 5. Return response ──────────────────────────────────────────
    return successResponse({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900, // 15 minutes in seconds
      tokenType: "Bearer",
    });
  } catch (error) {
    logger.error("Token refresh unexpected error", ctx, error);
    return internalErrorResponse(
      "An unexpected error occurred during token refresh"
    );
  }
}
