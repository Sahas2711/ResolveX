import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth";
import { logger, getClientIp, generateRequestId } from "@/lib/logger";

// -- Public API paths that do not require authentication ---------------------
const PUBLIC_API_PATHS = new Set([
  "/api/v1/auth/register",
  "/api/v1/auth/login",
  "/api/v1/auth/refresh",
  "/api/v1/health",
]);

// -- Proxy function ---------------------------------------------------------
/**
 * Auth & logging proxy that runs before every API route handler.
 *
 * Responsibilities:
 *   1. Generate and propagate a unique requestId for every request
 *   2. Skip auth for public routes (register, login, refresh)
 *   3. Verify JWT access tokens and attach user info as headers
 *   4. Log request lifecycle (start → auth result) with correlation IDs
 *   5. Return 401 JSON for invalid/missing tokens
 *
 * The x-request-id header flows through to route handlers, making it
 * possible to correlate all logs (proxy → handler → DB) for a single request.
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const ip = getClientIp(request);
  const start = performance.now();

  // Generate requestId for this request lifecycle
  const requestId = generateRequestId();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  // -- Log request ingress -------------------------------------------
  logger.debug("→ Proxy: request received", {
    requestId,
    ip,
    path: pathname,
    method: request.method,
  });

  // -- Public routes -------------------------------------------------
  if (PUBLIC_API_PATHS.has(pathname)) {
    logger.info("Proxy: public route — passing through", {
      requestId,
      ip,
      path: pathname,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
    });
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // -- Extract Bearer token ------------------------------------------
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    logger.warn("Proxy: missing Authorization header — 401", {
      requestId,
      ip,
      path: pathname,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
    });
    return Response.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      },
      {
        status: 401,
        headers: { "x-request-id": requestId },
      }
    );
  }

  const token = authHeader.slice(7);

  // -- Verify access token -------------------------------------------
  try {
    const decoded = await verifyAccessToken(token);

    logger.info("Proxy: token verified — forwarding to handler", {
      requestId,
      ip,
      path: pathname,
      userId: decoded.sub,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
    });

    // Attach user info as request headers for downstream route handlers
    requestHeaders.set("x-user-id", decoded.sub);
    requestHeaders.set("x-user-email", decoded.email);
    requestHeaders.set("x-user-roles", JSON.stringify(decoded.roleIds));

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch {
    logger.warn("Proxy: invalid or expired token — 401", {
      requestId,
      ip,
      path: pathname,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
    });
    return Response.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid or expired token" },
      },
      {
        status: 401,
        headers: { "x-request-id": requestId },
      }
    );
  }
}

// -- Matcher config ---------------------------------------------------------
// Proxy only runs on /api/v1/* routes. This avoids unnecessary invocations
// on pages, static files, and other non-API routes.
export const config = {
  matcher: ["/api/v1/:path*"],
};
