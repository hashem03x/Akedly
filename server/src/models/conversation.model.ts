import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import { CHANNELS, DIRECTIONS } from "../types/enums";

const conversationMessageSchema = new Schema(
  {
    direction: { type: String, enum: DIRECTIONS, required: true },
    content: { type: String, required: true },
    type: { type: String, required: true },
    externalId: { type: String },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const conversationSchema = new Schema(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },

    channel: { type: String, enum: CHANNELS, required: true },
    messages: { type: [conversationMessageSchema], default: [] },
  },
  { timestamps: true },
);

export type ConversationDocument = HydratedDocument<InferSchemaType<typeof conversationSchema>>;
export const Conversation = model("Conversation", conversationSchema);
