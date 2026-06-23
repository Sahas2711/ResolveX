// =============================================================================
// ResolveX — Health Check Endpoint
//
// GET /api/v1/health
//
// Returns server status, uptime, database connectivity, and environment info.
// No authentication required — used by monitoring tools and load balancers.
// =============================================================================

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { internalErrorResponse } from "@/lib/response";

// -- Server start timestamp (process lifetime) -------------------------------
const SERVER_START = Date.now();

// -- GET /api/v1/health -----------------------------------------------------

export async function GET() {
  const start = performance.now();

  try {
    // -- Database Connectivity -----------------------------------------
    let dbStatus: "healthy" | "unhealthy" = "healthy";
    let dbLatencyMs: number | null = null;

    try {
      const dbStart = performance.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Math.round((performance.now() - dbStart) * 100) / 100;
    } catch {
      dbStatus = "unhealthy";
    }

    const uptimeSeconds = Math.floor((Date.now() - SERVER_START) / 1000);

    const response = {
      success: true,
      data: {
        status: dbStatus === "healthy" ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
        uptime: {
          seconds: uptimeSeconds,
          human: formatUptime(uptimeSeconds),
        },
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        environment: process.env.NODE_ENV ?? "development",
      },
    };

    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    logger.info("Health check completed", {
      path: "/api/v1/health",
      dbStatus,
      dbLatencyMs,
      durationMs,
    });

    return Response.json(response, {
      status: dbStatus === "healthy" ? 200 : 503,
      headers: {
        "cache-control": "no-store, must-revalidate",
      },
    });
  } catch (error) {
    logger.error("Health check failed", {
      path: "/api/v1/health",
    }, error);

    return internalErrorResponse("Health check failed");
  }
}

// -- Helper -----------------------------------------------------------------

function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(" ");
}
