// =============================================================================
// ResolveX — Prisma Client Singleton
//
// Enterprise db client with:
//   - Singleton pattern (hot-reload safe in dev)
//   - Query logging via PrismaClient's built-in log option
//     (error and warn in all environments, query in dev only)
//   - PrismaPg adapter for PostgreSQL compatibility
// =============================================================================

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const IS_PROD = process.env.NODE_ENV === "production";

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });

  const client = new PrismaClient({
    adapter,
    log: IS_PROD
      ? ["error", "warn"]
      : ["query", "error", "warn"],
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (!IS_PROD) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
