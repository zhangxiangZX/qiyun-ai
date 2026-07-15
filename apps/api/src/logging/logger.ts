export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LoggerContext {
  /** Tenant / workspace dimension attached to every log entry. */
  workspaceId?: string;
}

export interface Logger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  debug(msg: string, meta?: Record<string, unknown>): void;
}

const LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

function emit(
  level: LogLevel,
  ctx: LoggerContext,
  msg: string,
  meta?: Record<string, unknown>,
): void {
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg,
  };
  if (ctx.workspaceId) {
    entry.workspaceId = ctx.workspaceId;
  }
  if (meta && typeof meta === "object") {
    for (const key of Object.keys(meta)) {
      const value = meta[key];
      if (value !== undefined) {
        entry[key] = value;
      }
    }
  }
  const line = JSON.stringify(entry);
  // Errors and warnings go to stderr, everything else to stdout.
  if (level === "error" || level === "warn") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

/**
 * Create a structured JSON logger. Each entry is emitted as a single line:
 * `{ ts, level, msg, workspaceId?, ...meta }`.
 *
 * This is a dependency-free implementation (used when `pino` is unavailable).
 * Swapping to pino later only requires changing the body of `emit`.
 */
export function createLogger(context: LoggerContext = {}): Logger {
  return {
    info: (msg, meta) => emit("info", context, msg, meta),
    warn: (msg, meta) => emit("warn", context, msg, meta),
    error: (msg, meta) => emit("error", context, msg, meta),
    debug: (msg, meta) => emit("debug", context, msg, meta),
  };
}

/** Current ordered log levels (kept for potential future level filtering). */
export const LOG_LEVELS = LEVELS;
