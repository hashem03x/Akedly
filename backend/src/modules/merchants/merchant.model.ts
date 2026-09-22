import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const MERCHANT_PLANS = ["trial", "starter", "growth"] as const;
export type MerchantPlan = (typeof MERCHANT_PLANS)[number];

const merchantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    plan: { type: String, enum: MERCHANT_PLANS, default: "trial" },
    onboardingCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type Merchant = InferSchemaType<typeof merchantSchema>;
export type MerchantDocument = HydratedDocument<Merchant>;

export const MerchantModel = model("Merchant", merchantSchema);
