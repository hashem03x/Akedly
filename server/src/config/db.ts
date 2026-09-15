import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../utils/logger";

// Every Mongoose document's .id virtual works fine as a direct property
// access, but is NOT included by default when a document is serialized to
// JSON (only _id is) — this makes it opt out instead of opt in, once,
// globally, so every route that returns a document directly (not a
// hand-built DTO) still gets a usable `id` in the response.
mongoose.set("toJSON", { virtuals: true });

mongoose.connection.on("connected", () => {
  logger.info("DATABASE", "MongoDB connection established");
});

mongoose.connection.on("error", (error: unknown) => {
  logger.error("DATABASE", "MongoDB connection error", {
    message: error instanceof Error ? error.message : String(error),
  });
});

mongoose.connection.on("disconnected", () => {
  logger.warn("DATABASE", "MongoDB disconnected");
});

/**
 * Non-fatal by design: Phase 1 has no routes that need the database yet,
 * so a missing/unreachable MONGODB_URI logs clearly instead of crashing
 * the process. Once persistence is actually used (Phase 4+), this should
 * become a hard failure on connect error.
 */
export async function connectDB(): Promise<void> {
  if (!env.mongodbUri) {
    logger.warn("DATABASE", "MONGODB_URI not set — skipping database connection");
    return;
  }

  try {
    await mongoose.connect(env.mongodbUri);
    // Mongoose builds indexes in the background after connecting/model
    // registration — without waiting for this, a burst of requests in the
    // first moments after startup (or, in tests, back-to-back requests
    // right after connectTestDB()) can land before a unique index (e.g.
    // WebhookEvent's provider+externalEventId) actually exists, silently
    // defeating the idempotency guarantee it's there for.
    await mongoose.syncIndexes();
  } catch (error) {
    logger.error("DATABASE", "Failed to connect to MongoDB", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export type DatabaseStatus = "disconnected" | "connected" | "connecting" | "disconnecting";

const READY_STATES: DatabaseStatus[] = ["disconnected", "connected", "connecting", "disconnecting"];

export function getDatabaseStatus(): DatabaseStatus {
  return READY_STATES[mongoose.connection.readyState] ?? "disconnected";
}
