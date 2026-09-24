import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const COMMUNICATION_CHANNELS = ["system", "whatsapp", "phone"] as const;
export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number];

export const COMMUNICATION_DIRECTIONS = ["outbound", "inbound"] as const;
export type CommunicationDirection = (typeof COMMUNICATION_DIRECTIONS)[number];

export const COMMUNICATION_TYPES = [
  "order_received",
  "confirmation_sent",
  "confirmation_response",
  "confirmation_failed",
  "cancellation_reason_requested",
  "order_expired",
  "store_synced",
] as const;
export type CommunicationType = (typeof COMMUNICATION_TYPES)[number];

export const COMMUNICATION_STATUSES = [
  // "accepted" = Meta's Graph API returned 200 for our send request — distinct
  // from "sent", which (for outbound whatsapp communications) means Meta's own
  // status webhook reported the message as actually sent to the WhatsApp
  // network. An HTTP 200 from the send call is not delivery confirmation; see
  // confirmation.service.ts and webhooks/whatsapp.webhook.ts's processStatusUpdate.
  "accepted",
  "sent",
  "delivered",
  "read",
  "failed",
  "confirmed",
  // Customer tapped the cancel button — order isn't cancelled yet, Akedly is
  // waiting for their reason. Final cancellation is a separate later event
  // (status "cancelled", same as before) once the reason arrives.
  "cancellation_requested",
  "cancelled",
  "invalid",
] as const;
export type CommunicationStatus = (typeof COMMUNICATION_STATUSES)[number];

const communicationSchema = new Schema(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },

    channel: { type: String, enum: COMMUNICATION_CHANNELS, required: true },
    direction: { type: String, enum: COMMUNICATION_DIRECTIONS, required: true },
    type: { type: String, enum: COMMUNICATION_TYPES, required: true },

    providerMessageId: { type: String },
    status: { type: String, enum: COMMUNICATION_STATUSES, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

communicationSchema.index({ orderId: 1, createdAt: 1 });
communicationSchema.index({ merchantId: 1, createdAt: -1 });

export type Communication = InferSchemaType<typeof communicationSchema>;
export type CommunicationDocument = HydratedDocument<Communication>;

export const CommunicationModel = model("Communication", communicationSchema);
