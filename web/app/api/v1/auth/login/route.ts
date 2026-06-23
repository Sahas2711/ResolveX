import prisma from "@/lib/prisma";
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";
import { loginSchema } from "@/lib/validators";
import {
  verifyPassword,
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  type JwtUserPayload,
} from "@/lib/auth";
import { logger, getClientIp } from "@/lib/logger";

/**
 * POST /api/v1/auth/login
 *
 * Authenticate a user and return access + refresh tokens.
 * - Verifies email and password
 * - Fetches the user's roles for JWT claims
 * - Updates `lastLoginAt` on successful login
 * - Persists refresh token with rotation (revokes previous active tokens)
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const ctx = { ip };

  try {
    // -- Parse & Validate Body ----------------------------------------
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      logger.warn("Login validation failed", { ...ctx, details });
      return validationErrorResponse(details);
    }

    const { email, password } = parsed.data;

    // -- Find user ----------------------------------------------------
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
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

    if (!user) {
      logger.info("Login failed: user not found", { ...ctx, email });
      return unauthorizedResponse("Invalid email or password");
    }

    if (!user.isActive || user.status !== "ACTIVE") {
      logger.info("Login failed: account inactive", {
        ...ctx,
        email,
        status: user.status,
        isActive: user.isActive,
      });
      return unauthorizedResponse(
        "Account is inactive. Please contact support."
      );
    }

    // -- Verify password ---------------------------------------------
    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      logger.info("Login failed: invalid password", { ...ctx, email });
      return unauthorizedResponse("Invalid email or password");
    }

    // -- Extract role IDs --------------------------------------------
    const roleIds = user.userRoles.map((ur: { role: { id: string } }) => ur.role.id);

    // -- Generate tokens ---------------------------------------------
    const jwtPayload: JwtUserPayload = {
      sub: user.id,
      email: user.email,
      roleIds,
    };

    const accessToken = await generateAccessToken(jwtPayload);
    const refreshTokenValue = await generateRefreshToken(user.id);
    const tokenHash = hashToken(refreshTokenValue);
    const tokenExpiresAt = getRefreshTokenExpiry();

    // -- Persist refresh token & update lastLoginAt (atomic) ---------
    await prisma.$transaction(async (tx: { refreshToken: { updateMany: (args: any) => Promise<any>; create: (args: any) => Promise<any> }; user: { update: (args: any) => Promise<any> } }) => {
      // Revoke any previously active refresh tokens (rotation)
      await tx.refreshToken.updateMany({
        where: { userId: user.id, revoked: false },
        data: { revoked: true },
      });

      // Persist the new refresh token
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: tokenExpiresAt,
          revoked: false,
        },
      });

      // Update last login timestamp
      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    });

    logger.info("Login successful", {
      ...ctx,
      email,
      userId: user.id,
      roleIds,
    });

    // -- Return response ----------------------------------------------
    return successResponse({
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: 900, // 15 minutes in seconds
      tokenType: "Bearer",
    });
  } catch (error) {
    logger.error("Login unexpected error", ctx, error);
    return internalErrorResponse("An unexpected error occurred during login");
  }
}
