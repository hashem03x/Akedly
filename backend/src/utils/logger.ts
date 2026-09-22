/* eslint-disable no-console */
type LogMeta = Record<string, unknown>;

function base(level: string, message: string, meta?: LogMeta) {
  const entry = { level, message, time: new Date().toISOString(), ...meta };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, meta?: LogMeta) => base("info", message, meta),
  warn: (message: string, meta?: LogMeta) => base("warn", message, meta),
  error: (message: string, meta?: LogMeta) => base("error", message, meta),
};
