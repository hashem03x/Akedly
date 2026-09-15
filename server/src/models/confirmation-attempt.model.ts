import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import { CHANNELS, CONFIRMATION_ATTEMPT_STATUSES, CONFIRMATION_RESULTS } from "../types/enums";

// The append-only timeline behind an Order's confirmation history — Order
// holds only the CURRENT confirmation state; this holds how it got there.
const confirmationAttemptSchema = new Schema(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant", required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },

    channel: { type: String, enum: CHANNELS, required: true },
    attemptNumber: { type: Number, required: true },

    status: { type: String, enum: CONFIRMATION_ATTEMPT_STATUSES, required: true, default: "PENDING" },
    result: { type: String, enum: CONFIRMATION_RESULTS },

    provider: { type: String, required: true },
    externalId: { type: String },

    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date },

    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

confirmationAttemptSchema.index({ orderId: 1, attemptNumber: 1 });

export type ConfirmationAttemptDocument = HydratedDocument<InferSchemaType<typeof confirmationAttemptSchema>>;
export const ConfirmationAttempt = model("ConfirmationAttempt", confirmationAttemptSchema);
