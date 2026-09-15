import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import { CONFIRMATION_METHODS, ORDER_STATUSES } from "../types/enums";

const orderItemSchema = new Schema(
  {
    productId: { type: String },
    variantId: { type: String },
    title: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
  },
  { _id: false },
);

// Snapshot of the customer at order time — independent of later edits to
// the Customer document.
const orderCustomerSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
  },
  { _id: false },
);

const confirmationStateSchema = new Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true, default: "PENDING_CONFIRMATION" },
    method: { type: String, enum: CONFIRMATION_METHODS },
    attempts: { type: Number, required: true, default: 0 },
    lastAttemptAt: { type: Date },
    confirmedAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },

    shopifyOrderId: { type: String, required: true },
    shopifyOrderNumber: { type: String, required: true },

    customer: { type: orderCustomerSchema, required: true },
    items: { type: [orderItemSchema], default: [] },

    subtotal: { type: Number, required: true },
    shipping: { type: Number, required: true, default: 0 },
    discount: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, required: true },

    status: { type: String, enum: ORDER_STATUSES, required: true, default: "PENDING_CONFIRMATION" },
    confirmation: { type: confirmationStateSchema, required: true, default: () => ({}) },
  },
  { timestamps: true },
);

// The idempotency guarantee for Shopify order webhooks: the same Shopify
// order, for the same merchant, can never produce two Order documents.
orderSchema.index({ merchantId: 1, shopifyOrderId: 1 }, { unique: true });
orderSchema.index({ merchantId: 1, status: 1, createdAt: -1 });

export type OrderDocument = HydratedDocument<InferSchemaType<typeof orderSchema>>;
export const Order = model("Order", orderSchema);
