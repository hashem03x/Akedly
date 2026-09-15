import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import { WEBHOOK_EVENT_STATUSES, WEBHOOK_PROVIDERS } from "../types/enums";

const webhookEventSchema = new Schema(
  {
    provider: { type: String, enum: WEBHOOK_PROVIDERS, required: true },
    externalEventId: { type: String, required: true },
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant" },
    topic: { type: String },
    status: { type: String, enum: WEBHOOK_EVENT_STATUSES, required: true, default: "RECEIVED" },
    receivedAt: { type: Date, required: true, default: Date.now },
    processedAt: { type: Date },
  },
  { timestamps: false },
);

// The idempotency guarantee: the same provider event is never recorded
// twice, regardless of how many times the provider retries delivery.
webhookEventSchema.index({ provider: 1, externalEventId: 1 }, { unique: true });

export type WebhookEventDocument = HydratedDocument<InferSchemaType<typeof webhookEventSchema>>;
export const WebhookEvent = model("WebhookEvent", webhookEventSchema);
