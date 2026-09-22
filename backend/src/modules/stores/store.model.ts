import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from "mongoose";

export const STORE_PLATFORMS = ["shopify", "woocommerce"] as const;
export type StorePlatform = (typeof STORE_PLATFORMS)[number];

export const STORE_STATUSES = ["connected", "disconnected", "error", "reauth_required"] as const;
export type StoreStatus = (typeof STORE_STATUSES)[number];

const storeSettingsSchema = new Schema(
  {
    autoConfirmationEnabled: { type: Boolean, default: true },
    confirmationChannel: { type: String, enum: ["whatsapp"], default: "whatsapp" },
    messageLanguage: { type: String, enum: ["ar", "en"], default: "ar" },
  },
  { _id: false }
);

const storeSchema = new Schema(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant", required: true, index: true },
    platform: { type: String, enum: STORE_PLATFORMS, required: true },

    name: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true, lowercase: true },

    // Encrypted at rest (see utils/crypto.ts). Never sent to the frontend.
    credentials: {
      accessToken: { type: String, select: false }, // Shopify admin API access token
      // Shopify expiring-offline-token lifecycle (see shopify-token-service.ts).
      // Absent on credentials created before this migration — that absence is
      // exactly how a legacy (non-expiring) token is detected.
      refreshToken: { type: String, select: false },
      accessTokenExpiresAt: { type: Date },
      refreshTokenExpiresAt: { type: Date },
      consumerKey: { type: String, select: false }, // WooCommerce
      consumerSecret: { type: String, select: false }, // WooCommerce
      webhookSecret: { type: String, select: false }, // WooCommerce delivery signature secret
    },

    status: { type: String, enum: STORE_STATUSES, default: "disconnected" },
    lastConnectionTestAt: { type: Date },
    lastConnectionError: { type: String },

    settings: { type: storeSettingsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

storeSchema.index({ merchantId: 1, platform: 1, domain: 1 }, { unique: true });

export type Store = InferSchemaType<typeof storeSchema>;
export type StoreDocument = HydratedDocument<Store> & { _id: Types.ObjectId };

export const StoreModel = model("Store", storeSchema);
