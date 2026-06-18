import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth";
import { logger, getClientIp } from "@/lib/logger";

// ── Public API paths that do not require authentication ─────────────────────
const PUBLIC_API_PATHS = new Set([
  "/api/v1/auth/register",
  "/api/v1/auth/login",
  "/api/v1/auth/refresh",
]);

// ── Proxy function ─────────────────────────────────────────────────────────
/**
 * Auth proxy that runs on matching API routes before the request handler.
 * - Skips auth for public routes (register, login, refresh)
 * - Verifies the JWT access token from the Authorization header
 * - Attaches user info (x-user-id, x-user-email, x-user-roles) as request headers
 * - Returns a 401 JSON response for invalid or missing tokens
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const ip = getClientIp(request);

  // Allow public auth routes through without authentication
  if (PUBLIC_API_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Extract Bearer token
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    logger.warn("Proxy: missing Authorization header", { ip, path: pathname });
    return Response.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);

  // Verify access token
  try {
    const decoded = await verifyAccessToken(token);

    logger.debug("Proxy: token verified", {
      ip,
      path: pathname,
      userId: decoded.sub,
    });

    // Attach user info as request headers for downstream handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", decoded.sub);
    requestHeaders.set("x-user-email", decoded.email);
    requestHeaders.set("x-user-roles", JSON.stringify(decoded.roleIds));

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch {
    logger.warn("Proxy: invalid or expired token", { ip, path: pathname });
    return Response.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid or expired token" },
      },
      { status: 401 }
    );
  }
}

// ── Matcher config ─────────────────────────────────────────────────────────
// Proxy only runs on /api/v1/* routes. This avoids unnecessary invocations
// on pages, static files, and other non-API routes.
export const config = {
  matcher: ["/api/v1/:path*"],
};
