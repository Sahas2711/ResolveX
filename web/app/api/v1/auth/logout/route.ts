import prisma from "@/lib/prisma";
import { noContentResponse, unauthorizedResponse, internalErrorResponse } from "@/lib/response";
import { verifyAccessToken } from "@/lib/auth";
import { logger, getClientIp } from "@/lib/logger";

/**
 * POST /api/v1/auth/logout
 *
 * Logout the current user by revoking all their active refresh tokens.
 * Requires a valid Bearer access token in the Authorization header.
 * Returns 204 No Content on success.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const ctx = { ip };

  try {
    // ── Extract Bearer token ────────────────────────────────────────
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logger.warn("Logout failed: missing Authorization header", ctx);
      return unauthorizedResponse("Authentication required");
    }

    const token = authHeader.slice(7);

    // ── Verify access token ─────────────────────────────────────────
    let payload: { sub: string; email: string };
    try {
      payload = await verifyAccessToken(token);
    } catch {
      logger.warn("Logout failed: invalid or expired token", ctx);
      return unauthorizedResponse("Invalid or expired token");
    }

    // ── Revoke all active refresh tokens for this user ──────────────
    const result = await prisma.refreshToken.updateMany({
      where: {
        userId: payload.sub,
        revoked: false,
      },
      data: { revoked: true },
    });

    logger.info("Logout successful", {
      ...ctx,
      userId: payload.sub,
      email: payload.email,
      revokedCount: result.count,
    });

    return noContentResponse();
  } catch (error) {
    logger.error("Logout unexpected error", ctx, error);
    return internalErrorResponse("An unexpected error occurred during logout");
  }
}
