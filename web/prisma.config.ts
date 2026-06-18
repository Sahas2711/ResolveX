import { defineConfig, env } from "prisma/config";

/**
 * Resolve the datasource URL with multiple fallbacks:
 * 1. `process.env.DATABASE_URL` — set at runtime / Vercel build
 * 2. `env("DATABASE_URL")` — Prisma 7 Vercel env reference
 * 3. Fallback dummy — only used during `prisma generate` on Vercel install
 *    (generate does not actually connect to the database)
 */
function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  try {
    return env("DATABASE_URL");
  } catch {
    // During `npm install` on Vercel, DATABASE_URL is not yet available.
    // `prisma generate` only needs a valid URL syntactically — it doesn't
    // actually connect. The real URL is injected during the build step.
    return "postgresql://placeholder:placeholder@placeholder:5432/placeholder";
  }
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
