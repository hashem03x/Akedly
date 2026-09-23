import { AsyncLocalStorage } from "async_hooks";
import crypto from "crypto";

interface RequestContext {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** Generates a short, greppable correlation id: ak_<12 hex chars>. */
export function generateRequestId(): string {
  return `ak_${crypto.randomBytes(6).toString("hex")}`;
}

/**
 * Runs `fn` with a requestId bound to Node's AsyncLocalStorage, so every log
 * line emitted anywhere in the call tree below `fn` (webhook handler ->
 * order service -> WhatsApp provider -> communication service) automatically
 * carries the same correlation id without threading it through every
 * function signature. See utils/logger.ts, which reads it back via
 * getRequestId().
 */
export function runWithRequestId<T>(requestId: string, fn: () => T): T {
  return storage.run({ requestId }, fn);
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}
