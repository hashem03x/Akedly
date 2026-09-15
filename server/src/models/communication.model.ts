import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import { CHANNELS, COMMUNICATION_STATUSES, DIRECTIONS } from "../types/enums";

const communicationSchema = new Schema(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },

    channel: { type: String, enum: CHANNELS, required: true },
    direction: { type: String, enum: DIRECTIONS, required: true },
    provider: { type: String, required: true },
    externalMessageId: { type: String },

    content: { type: String, required: true },
    status: { type: String, enum: COMMUNICATION_STATUSES, required: true, default: "PENDING" },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

communicationSchema.index({ orderId: 1, createdAt: 1 });
// Sparse: only enforced when an externalMessageId is actually present.
communicationSchema.index({ provider: 1, externalMessageId: 1 }, { unique: true, sparse: true });

export type CommunicationDocument = HydratedDocument<InferSchemaType<typeof communicationSchema>>;
export const Communication = model("Communication", communicationSchema);
