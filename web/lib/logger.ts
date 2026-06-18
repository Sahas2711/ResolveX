// =============================================================================
// Structured Logger
// Provides consistent logging with levels, timestamps, and context metadata.
// In development: human-readable output with colors.
// In production: structured JSON for log aggregation (CloudWatch, Datadog, etc.)
// =============================================================================

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  userId?: string;
  email?: string;
  ip?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: { name: string; message: string; stack?: string };
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext, error?: unknown): void;
  error(message: string, context?: LogContext, error?: unknown): void;
  child(defaultContext: LogContext): Logger;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getConfiguredLevel(): number {
  const envLevel = process.env.LOG_LEVEL as LogLevel | undefined;
  if (envLevel && envLevel in LOG_LEVELS) {
    return LOG_LEVELS[envLevel];
  }
  return process.env.NODE_ENV === "production"
    ? LOG_LEVELS.info
    : LOG_LEVELS.debug;
}

const currentLevel = getConfiguredLevel();

function formatTimestamp(): string {
  return new Date().toISOString();
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= currentLevel;
}

function stringifyError(
  err: unknown
): { name: string; message: string; stack?: string } | undefined {
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
  error?: unknown
): LogEntry {
  return {
    timestamp: formatTimestamp(),
    level,
    message,
    context,
    error: error ? stringifyError(error) : undefined,
  };
}

function writeEntry(entry: LogEntry): void {
  if (process.env.NODE_ENV === "production") {
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

function createLogger(defaultContext?: LogContext): Logger {
  return {
    debug(message: string, context?: LogContext): void {
      if (shouldLog("debug")) {
        writeEntry(
          createEntry("debug", message, { ...defaultContext, ...context })
        );
      }
    },

    info(message: string, context?: LogContext): void {
      if (shouldLog("info")) {
        writeEntry(
          createEntry("info", message, { ...defaultContext, ...context })
        );
      }
    },

    warn(message: string, context?: LogContext, error?: unknown): void {
      if (shouldLog("warn")) {
        writeEntry(
          createEntry("warn", message, { ...defaultContext, ...context }, error)
        );
      }
    },

    error(message: string, context?: LogContext, error?: unknown): void {
      if (shouldLog("error")) {
        writeEntry(
          createEntry("error", message, { ...defaultContext, ...context }, error)
        );
      }
    },

    child(additionalContext: LogContext): Logger {
      return createLogger({ ...defaultContext, ...additionalContext });
    },
  };
}

/** Root logger instance. Use `logger.child(...)` to create scoped loggers. */
export const logger: Logger = createLogger();

/** Extract the originating client IP from the `x-forwarded-for` header. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]!.trim();
  }
  return "unknown";
}
