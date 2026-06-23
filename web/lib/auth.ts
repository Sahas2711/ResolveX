import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import crypto from "node:crypto";

// -- Constants --------------------------------------------------------------

const BCRYPT_COST = 12;
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d"; // must match generateRefreshToken expiry

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

function getRefreshSecret(): Uint8Array {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

// -- Token hashing (for storage / verification) -----------------------------

/**
 * Hash a token value for secure storage in the database.
 * Uses SHA-256 so the stored hash cannot be reversed.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// -- Password Hashing -------------------------------------------------------

export interface JwtUserPayload extends JWTPayload {
  sub: string;
  email: string;
  roleIds: string[];
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// -- JWT Tokens -------------------------------------------------------------

export async function generateAccessToken(payload: JwtUserPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(getJwtSecret());
}

export async function generateRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(getRefreshSecret());
}

export async function verifyAccessToken(
  token: string
): Promise<JwtUserPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret());
  return payload as JwtUserPayload;
}

export async function verifyRefreshToken(
  token: string
): Promise<{ sub: string }> {
  const { payload } = await jwtVerify(token, getRefreshSecret());
  return { sub: payload.sub as string };
}

/**
 * Calculate the `expiresAt` date from the refresh token's TTL.
 * Uses the same 7-day duration as the JWT expiry claim.
 */
export function getRefreshTokenExpiry(): Date {
  const now = new Date();
  now.setDate(now.getDate() + 7);
  return now;
}
