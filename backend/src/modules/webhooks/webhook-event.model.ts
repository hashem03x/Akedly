import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

/**
 * Records every inbound webhook delivery we've processed, keyed by a source-specific
 * idempotency key, so retried/duplicate deliveries (Shopify, WooCommerce, WhatsApp all
 * retry on timeout) are safely ignored.
 *
 * `status` tracks whether processing actually finished, not just whether a delivery
 * was seen: claiming happens before processing starts (so a concurrent retry can't
 * race in), but a delivery whose processing crashed or threw partway through must
 * remain retryable — otherwise the FIRST (failed) attempt permanently blackholes the
 * event and every subsequent retry is silently swallowed as "already seen", even
 * though nothing was ever actually created. Only "completed" is a true duplicate.
 */
const webhookEventSchema = new Schema(
  {
    source: { type: String, enum: ["shopify", "woocommerce", "whatsapp"], required: true },
    idempotencyKey: { type: String, required: true },
    status: { type: String, enum: ["processing", "completed", "failed"], default: "processing" },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

webhookEventSchema.index({ source: 1, idempotencyKey: 1 }, { unique: true });

export type WebhookEvent = InferSchemaType<typeof webhookEventSchema>;
export type WebhookEventDocument = HydratedDocument<WebhookEvent>;

export const WebhookEventModel = model("WebhookEvent", webhookEventSchema);

/**
 * Atomically claims an idempotency key. Returns true if the caller should process
 * this delivery — either genuinely new, or a previous attempt never reached
 * `completeWebhookEvent` (crashed, threw, or timed out mid-flight) and is safe/
 * necessary to retry. Returns false only when a previous attempt already completed
 * successfully — a true duplicate that should be skipped.
 */
export async function claimWebhookEvent(
  source: WebhookEvent["source"],
  idempotencyKey: string
): Promise<boolean> {
  try {
    await WebhookEventModel.create({ source, idempotencyKey, status: "processing" });
    return true;
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      const existing = await WebhookEventModel.findOne({ source, idempotencyKey });
      return existing?.status !== "completed";
    }
    throw err;
  }
}

/** Marks a claimed event as successfully processed, so future deliveries are true duplicates. */
export async function completeWebhookEvent(source: WebhookEvent["source"], idempotencyKey: string): Promise<void> {
  await WebhookEventModel.updateOne({ source, idempotencyKey }, { $set: { status: "completed" } });
}

/** Marks a claimed event as failed, leaving it retryable on the next delivery. */
export async function failWebhookEvent(source: WebhookEvent["source"], idempotencyKey: string): Promise<void> {
  await WebhookEventModel.updateOne({ source, idempotencyKey }, { $set: { status: "failed" } });
}
