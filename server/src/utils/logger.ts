type LogLevel = "debug" | "info" | "warn" | "error";

function timestamp(): string {
  return new Date().toISOString();
}

function write(level: LogLevel, scope: string, message: string, meta?: Record<string, unknown>): void {
  const line = `[${timestamp()}] [${level.toUpperCase()}] [${scope}] ${message}`;
  const payload = meta ? `${line} ${JSON.stringify(meta)}` : line;

  if (level === "error") {
    console.error(payload);
  } else if (level === "warn") {
    console.warn(payload);
  } else {
    console.log(payload);
  }
}

export const logger = {
  debug(scope: string, message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== "production") write("debug", scope, message, meta);
  },
  info(scope: string, message: string, meta?: Record<string, unknown>): void {
    write("info", scope, message, meta);
  },
  warn(scope: string, message: string, meta?: Record<string, unknown>): void {
    write("warn", scope, message, meta);
  },
  error(scope: string, message: string, meta?: Record<string, unknown>): void {
    write("error", scope, message, meta);
  },
};
