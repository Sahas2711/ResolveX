// =============================================================================
// ResolveX — Enterprise Structured Logger
//
// Features:
//   - Async buffered writes (non-blocking, flushes on next tick)
//   - Configurable log level per environment
//   - Sampling support for high-volume debug logs
//   - Request correlation ID generation and propagation
//   - Duration/performance tracking utility
//   - Structured JSON in production, colorized in development
//   - Child loggers for scoped context
//   - Dev: formatted console output with colors
//   - Prod: JSON Lines for log aggregation (CloudWatch, Datadog, ELK)
// =============================================================================

// ── Types ──────────────────────────────────────────────────────────────────

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  userId?: string;
  email?: string;
  ip?: string;
  durationMs?: number;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: { name: string; message: string; stack?: string };
}

export interface SamplingConfig {
  /** 0.0–1.0: probability of logging a debug message (default 0.1 in prod) */
  debug?: number;
  /** info is always logged */
  info?: number;
  /** warn is always logged */
  warn?: number;
  /** error is always logged */
  error?: number;
}

export interface LoggerOptions {
  /** Minimum log level to emit */
  level?: LogLevel;
  /** Default context merged into every log entry */
  defaultContext?: LogContext;
  /** Sampling rates for each level (overrides defaults) */
  sampling?: SamplingConfig;
  /** Enable async buffered writes (default true) */
  async?: boolean;
}

export interface Logger {
  /** Log at debug level (subject to sampling in production) */
  debug(message: string, context?: LogContext): void;
  /** Log at info level */
  info(message: string, context?: LogContext): void;
  /** Log at warn level */
  warn(message: string, context?: LogContext, error?: unknown): void;
  /** Log at error level */
  error(message: string, context?: LogContext, error?: unknown): void;
  /** Flush buffered logs (returns when buffer is empty) */
  flush(): Promise<void>;
  /** Create a scoped child logger with additional default context */
  child(defaultContext: LogContext): Logger;
}

// ── Constants ──────────────────────────────────────────────────────────────

const LOG_LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const IS_PROD = process.env.NODE_ENV === "production";

const DEFAULT_SAMPLING: SamplingConfig = {
  debug: IS_PROD ? 0.1 : 1.0,
  info: 1.0,
  warn: 1.0,
  error: 1.0,
};

// ── Internal State ─────────────────────────────────────────────────────────

let buffer: LogEntry[] = [];
let flushScheduled = false;

// ── Helpers ────────────────────────────────────────────────────────────────

function shouldLog(level: LogLevel, configuredLevel: number, sampling: SamplingConfig): boolean {
  if (LOG_LEVEL_RANK[level] < configuredLevel) return false;
  const rate = sampling[level] ?? 1.0;
  if (rate >= 1.0) return true;
  return Math.random() < rate;
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function stringifyError(err: unknown): { name: string; message: string; stack?: string } | undefined {
  if (!err) return undefined;
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    };
  }
  return { name: "Unknown", message: String(err) };
}

function createEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: unknown,
): LogEntry {
  return {
    timestamp: formatTimestamp(),
    level,
    message,
    context,
    error: error ? stringifyError(error) : undefined,
  };
}

// ── Async Buffer ───────────────────────────────────────────────────────────

function scheduleFlush(): void {
  if (flushScheduled) return;
  flushScheduled = true;
  // Use microtask to avoid delaying the request/response cycle
  queueMicrotask(() => {
    const batch = buffer;
    buffer = [];
    flushScheduled = false;
    for (const entry of batch) {
      writeEntrySync(entry);
    }
  });
}

function enqueue(entry: LogEntry): void {
  if (!IS_PROD) {
    // Dev: write synchronously for immediate feedback during development
    writeEntrySync(entry);
    return;
  }
  buffer.push(entry);
  if (buffer.length >= 100) {
    // Flush immediately if buffer is full (backpressure protection)
    const batch = buffer;
    buffer = [];
    flushScheduled = false;
    for (const entry of batch) {
      writeEntrySync(entry);
    }
  } else {
    scheduleFlush();
  }
}

// ── Sync Writer ────────────────────────────────────────────────────────────

function writeEntrySync(entry: LogEntry): void {
  if (IS_PROD) {
    const output = JSON.stringify(entry);
    switch (entry.level) {
      case "error":
        console.error(output);
        break;
      case "warn":
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  } else {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
    const err = entry.error
      ? `\n  Error: ${entry.error.name}: ${entry.error.message}${
          entry.error.stack ? `\n${entry.error.stack}` : ""
        }`
      : "";

    const logFn =
      entry.level === "error"
        ? console.error
        : entry.level === "warn"
          ? console.warn
          : console.log;

    logFn(`${prefix}${ctx} ${entry.message}${err}`);
  }
}

// ── Logger Factory ─────────────────────────────────────────────────────────

function createLogger(options?: LoggerOptions): Logger {
  const configuredLevel = options?.level ?? (IS_PROD ? "info" : "debug");
  const levelRank = LOG_LEVEL_RANK[configuredLevel];
  const defaultCtx = options?.defaultContext ?? {};
  const sampling = { ...DEFAULT_SAMPLING, ...options?.sampling };
  const useAsync = options?.async ?? true;

  function log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: unknown,
  ): void {
    if (!shouldLog(level, levelRank, sampling)) return;

    const entry = createEntry(level, message, { ...defaultCtx, ...context }, error);

    if (useAsync && IS_PROD) {
      enqueue(entry);
    } else {
      writeEntrySync(entry);
    }
  }

  return {
    debug(message: string, context?: LogContext): void {
      log("debug", message, context);
    },

    info(message: string, context?: LogContext): void {
      log("info", message, context);
    },

    warn(message: string, context?: LogContext, error?: unknown): void {
      log("warn", message, context, error);
    },

    error(message: string, context?: LogContext, error?: unknown): void {
      log("error", message, context, error);
    },

    async flush(): Promise<void> {
      if (buffer.length === 0) return;
      return new Promise((resolve) => {
        const batch = buffer;
        buffer = [];
        flushScheduled = false;
        for (const entry of batch) writeEntrySync(entry);
        resolve();
      });
    },

    child(additionalContext: LogContext): Logger {
      return createLogger({
        level: configuredLevel,
        defaultContext: { ...defaultCtx, ...additionalContext },
        sampling,
        async: useAsync,
      });
    },
  };
}

// ── Singleton ──────────────────────────────────────────────────────────────

/** Root application logger. */
export const logger: Logger = createLogger();

// ── Request Correlation ────────────────────────────────────────────────────

/**
 * Generates a unique request correlation ID.
 * Uses the Web Crypto API (available in both Node.js and Edge runtimes).
 * Falls back to a Math.random()-based ID if crypto is unavailable.
 */
export function generateRequestId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}-${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Creates a scoped logger pre-populated with request-level context.
 * Pass this to route handlers to ensure every log includes requestId, ip, path.
 */
export function requestLogger(request: Request): { logger: Logger; requestId: string } {
  // Use existing requestId from proxy (if present) for end-to-end correlation
  const existingId = request.headers.get("x-request-id");
  const requestId = existingId ?? generateRequestId();
  const ip = getClientIp(request);
  const url = new URL(request.url);

  const ctx: LogContext = {
    requestId,
    ip,
    path: url.pathname,
    method: request.method,
  };

  return { logger: logger.child(ctx), requestId };
}

/**
 * Extract the originating client IP from the `x-forwarded-for` header.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]!.trim();
  }
  return "unknown";
}

// ── Duration Tracking ──────────────────────────────────────────────────────

/**
 * Wraps an async operation with duration logging.
 * Logs `message` on success with `durationMs` in context.
 * Logs errors at error level with the same prefix.
 *
 * Performance: uses `performance.now()` (sub-millisecond, no GC pressure).
 * The overhead is ~0.01ms per call — negligible.
 *
 * @example
 * const result = await logDuration(logger, ctx, "Fetching users", () =>
 *   prisma.user.findMany(...)
 * );
 */
export async function logDuration<T>(
  log: Logger,
  context: LogContext,
  message: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    log.info(message, { ...context, durationMs });
    return result;
  } catch (error) {
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    log.error(`${message} — failed`, { ...context, durationMs }, error);
    throw error;
  }
}

/**
 * Synchronous duration tracker — use for measuring sync operations.
 * Returns the result and the elapsed time in milliseconds.
 */
export function measureSync<T>(fn: () => T): { result: T; durationMs: number } {
  const start = performance.now();
  const result = fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}
