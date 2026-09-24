import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from "mongoose";

// "awaiting_cancellation_reason" sits between pending and cancelled: the customer
// tapped the cancel button, but the order isn't actually cancelled yet — Akedly
// is waiting on their free-text reply with a reason. See confirmation.service.ts's
// startCancellationReasonCollection/completeCancellationWithReason and
// webhooks/whatsapp.webhook.ts's tryHandleAsCancellationReason.
export const CONFIRMATION_STATUSES = [
  "pending",
  "awaiting_cancellation_reason",
  "confirmed",
  "cancelled",
  "expired",
] as const;
export type ConfirmationStatus = (typeof CONFIRMATION_STATUSES)[number];

export const CONFIRMATION_CHANNELS = ["whatsapp", "phone"] as const;
export type ConfirmationChannel = (typeof CONFIRMATION_CHANNELS)[number];

const orderItemSchema = new Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderCustomerSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant", required: true },
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true },

    externalOrderId: { type: String, required: true },
    orderNumber: { type: String, required: true },

    customer: { type: orderCustomerSchema, required: true },
    items: { type: [orderItemSchema], default: [] },

    subtotal: { type: Number, required: true, default: 0 },
    shipping: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true, default: "USD" },

    platform: { type: String, enum: ["shopify", "woocommerce"], required: true },

    confirmationStatus: {
      type: String,
      enum: CONFIRMATION_STATUSES,
      default: "pending",
      required: true,
    },
    confirmationChannel: { type: String, enum: CONFIRMATION_CHANNELS, default: null },
    confirmedAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
  },
  { timestamps: true }
);

// One order per store per external order id — also the idempotency guard for order webhooks.
orderSchema.index({ storeId: 1, externalOrderId: 1 }, { unique: true });
orderSchema.index({ merchantId: 1, createdAt: -1 });
orderSchema.index({ merchantId: 1, confirmationStatus: 1 });
orderSchema.index({ "customer.phone": 1 });
orderSchema.index({ orderNumber: "text" });

export type Order = InferSchemaType<typeof orderSchema>;
export type OrderDocument = HydratedDocument<Order> & { _id: Types.ObjectId };

export const OrderModel = model("Order", orderSchema);
