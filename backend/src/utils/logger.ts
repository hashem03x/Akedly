/* eslint-disable no-console */
import { getRequestId } from "./request-context";

type LogMeta = Record<string, unknown>;

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVELS;

// DEBUG-level logs are noisy and only useful locally; everything INFO and
// above always ships so production incidents stay diagnosable.
const MIN_LEVEL: Level = process.env.NODE_ENV === "production" ? "info" : "debug";

function base(level: Level, event: string, meta?: LogMeta) {
  if (LEVELS[level] < LEVELS[MIN_LEVEL]) return;

  const requestId = getRequestId();
  const entry = {
    level,
    event,
    time: new Date().toISOString(),
    ...(requestId ? { requestId } : {}),
    ...meta,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (event: string, meta?: LogMeta) => base("debug", event, meta),
  info: (event: string, meta?: LogMeta) => base("info", event, meta),
  warn: (event: string, meta?: LogMeta) => base("warn", event, meta),
  error: (event: string, meta?: LogMeta) => base("error", event, meta),
};
