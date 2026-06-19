import prisma from "@/lib/prisma";
import {
  createdResponse,
  conflictResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/response";
import { registerSchema } from "@/lib/validators";
import {
  hashPassword,
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  type JwtUserPayload,
} from "@/lib/auth";

/**
 * POST /api/v1/auth/register
 *
 * Register a new customer account.
 * - Splits `name` into `firstName` / `lastName` by the first space
 * - Auto-generates an `employeeId` for customers
 * - Assigns the CUSTOMER role by default
 * - Persists refresh token in the database for revocation support
 * - Returns access + refresh tokens immediately (no separate login step needed)
 */
export async function POST(request: Request) {
  try {
    // ── Parse & Validate Body ────────────────────────────────────────
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        constraint: issue.code,
      }));
      return validationErrorResponse(details);
    }

    const { email, password, name } = parsed.data;

    // ── Split name into firstName / lastName ─────────────────────────
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0]!;
    // If only a single name was provided, lastName is set to empty string
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    // ── Check for duplicate email ────────────────────────────────────
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return conflictResponse("A user with this email address already exists");
    }

    // ── Verify CUSTOMER role exists ──────────────────────────────────
    const customerRole = await prisma.role.findUnique({
      where: { name: "CUSTOMER" },
      select: { id: true },
    });

    if (!customerRole) {
      console.error(
        "[register] CUSTOMER role not found. Run `npx prisma db seed` to seed default roles."
      );
      return internalErrorResponse("Registration is temporarily unavailable");
    }

    // ── Generate a unique employeeId ─────────────────────────────────
    const employeeId = `EMP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // ── Hash password ────────────────────────────────────────────────
    const passwordHash = await hashPassword(password);

    // ── Create user, assign role & persist refresh token (atomic) ──
    let refreshTokenValue = "";

    const user = await prisma.$transaction(async (tx: { user: { create: (args: any) => Promise<any> }; userRole: { create: (args: any) => Promise<any> }; refreshToken: { create: (args: any) => Promise<any> } }) => {
      // 1. Create user
      const newUser = await tx.user.create({
        data: {
          employeeId,
          firstName,
          lastName,
          email,
          passwordHash,
          status: "ACTIVE",
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          createdAt: true,
        },
      });

      // 2. Assign CUSTOMER role
      await tx.userRole.create({
        data: {
          userId: newUser.id,
          roleId: customerRole.id,
        },
      });

      // 3. Generate & persist refresh token
      refreshTokenValue = await generateRefreshToken(newUser.id);
      const tokenHash = hashToken(refreshTokenValue);
      const tokenExpiresAt = getRefreshTokenExpiry();

      await tx.refreshToken.create({
        data: {
          userId: newUser.id,
          tokenHash,
          expiresAt: tokenExpiresAt,
          revoked: false,
        },
      });

      return newUser;
    });

    // ── Generate access token ────────────────────────────────────────
    const jwtPayload: JwtUserPayload = {
      sub: user.id,
      email: user.email,
      roleIds: [customerRole.id],
    };
    const accessToken = await generateAccessToken(jwtPayload);

    // ── Return response ──────────────────────────────────────────────
    return createdResponse({
      userId: user.id,
      email: user.email,
      name: name.trim(),
      message: "Registration successful.",
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: 900, // 15 minutes in seconds
      tokenType: "Bearer",
    });
  } catch (error) {
    console.error("[register] Unexpected error:", error);
    return internalErrorResponse("An unexpected error occurred during registration");
  }
}
