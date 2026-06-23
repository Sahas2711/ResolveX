import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { defineConfig } from "prisma/config";

// -- Auto-load .env file ----------------------------------------------------
// Prisma v7 does not automatically load .env when using prisma.config.ts.
// This helper reads the .env file from the project root so that DATABASE_URL
// and other variables are available to both the config and the seed script.

function loadEnv(): void {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const eqIdx = trimmed.indexOf("=");
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv();

/**
 * Resolve the datasource URL:
 * 1. `process.env.DATABASE_URL` — set by .env file, runtime, or CI
 * 2. Fallback dummy — only used during `prisma generate` on Vercel install
 *    (generate does not actually connect to the database)
 */
function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // During `npm install` on Vercel, DATABASE_URL is not yet available.
  // `prisma generate` only needs a valid URL syntactically — it doesn't
  // actually connect. The real URL is injected during the build step.
  return "postgresql://placeholder:placeholder@placeholder:5432/placeholder";
}

export default defineConfig({
  datasource: {
    url: resolveDatabaseUrl(),
  },
  schema: "./prisma/schema.prisma",
  migrations: {
    path: "./prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
