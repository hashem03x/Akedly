import { logger } from "../utils/logger";
import type { JobQueue } from "./job-queue";

/**
 * NOT PRODUCTION-SAFE. Jobs live only in this process's memory — a
 * restart or crash silently drops every pending scheduled task (e.g. a
 * voice fallback call that hasn't fired yet). Fine for local development;
 * before production this must be replaced with a durable queue (BullMQ +
 * Redis, or equivalent) behind the same JobQueue interface — nothing in
 * ConfirmationService or callers would need to change.
 */
export class InMemoryJobQueue implements JobQueue {
  schedule(delayMs: number, task: () => Promise<void> | void): void {
    const timer = setTimeout(() => {
      Promise.resolve(task()).catch((error: unknown) => {
        logger.error("JOB_QUEUE", "In-memory job failed", {
          message: error instanceof Error ? error.message : String(error),
        });
      });
    }, delayMs);
    // Don't let a pending fallback timer keep the process (or a test run)
    // alive on its own.
    timer.unref();
  }
}

export const jobQueue: JobQueue = new InMemoryJobQueue();
