import { Schema, model, Types, type HydratedDocument, type InferSchemaType } from "mongoose";

const customerStatisticsSchema = new Schema(
  {
    totalOrders: { type: Number, required: true, default: 0 },
    confirmedOrders: { type: Number, required: true, default: 0 },
    cancelledOrders: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const customerSchema = new Schema(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant", required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    statistics: { type: customerStatisticsSchema, required: true, default: () => ({}) },
  },
  { timestamps: true },
);

// A customer is scoped to one merchant — the same phone number can exist
// as a separate Customer document under a different merchant.
customerSchema.index({ merchantId: 1, phone: 1 }, { unique: true });

export type CustomerDocument = HydratedDocument<InferSchemaType<typeof customerSchema>>;
export const Customer = model("Customer", customerSchema);
export type CustomerId = Types.ObjectId;
