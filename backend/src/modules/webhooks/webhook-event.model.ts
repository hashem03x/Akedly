import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

/**
 * Records every inbound webhook delivery we've processed, keyed by a source-specific
 * idempotency key, so retried/duplicate deliveries (Shopify, WooCommerce, WhatsApp all
 * retry on timeout) are safely ignored.
 */
const webhookEventSchema = new Schema(
  {
    source: { type: String, enum: ["shopify", "woocommerce", "whatsapp"], required: true },
    idempotencyKey: { type: String, required: true },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

webhookEventSchema.index({ source: 1, idempotencyKey: 1 }, { unique: true });

export type WebhookEvent = InferSchemaType<typeof webhookEventSchema>;
export type WebhookEventDocument = HydratedDocument<WebhookEvent>;

export const WebhookEventModel = model("WebhookEvent", webhookEventSchema);

/**
 * Atomically claims an idempotency key. Returns true if this is the first time we've
 * seen it (caller should process it), false if it's a duplicate (caller should skip).
 */
export async function claimWebhookEvent(
  source: WebhookEvent["source"],
  idempotencyKey: string
): Promise<boolean> {
  try {
    await WebhookEventModel.create({ source, idempotencyKey });
    return true;
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return false;
    }
    throw err;
  }
}
