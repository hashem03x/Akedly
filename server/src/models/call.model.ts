import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import { CALL_RESULTS } from "../types/enums";

const callSchema = new Schema(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },

    provider: { type: String, required: true },
    externalCallId: { type: String },

    status: { type: String, required: true },
    result: { type: String, enum: CALL_RESULTS },

    duration: { type: Number },
    transcript: { type: String },
    metadata: { type: Schema.Types.Mixed },

    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

callSchema.index({ provider: 1, externalCallId: 1 }, { unique: true, sparse: true });

export type CallDocument = HydratedDocument<InferSchemaType<typeof callSchema>>;
export const Call = model("Call", callSchema);
