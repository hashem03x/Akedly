import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const merchantSettingsSchema = new Schema(
  {
    confirmationEnabled: { type: Boolean, required: true, default: true },
    whatsappEnabled: { type: Boolean, required: true, default: true },
    voiceFallbackEnabled: { type: Boolean, required: true, default: true },
    voiceFallbackDelayMinutes: { type: Number, required: true, default: 15 },
    maxConfirmationAttempts: { type: Number, required: true, default: 3 },
  },
  { _id: false },
);

const merchantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    // select: false — never returned by default queries; must opt in with
    // .select("+passwordHash"), and it's stripped again before any response
    // leaves the API (see auth.service.ts's toPublicMerchant).
    passwordHash: { type: String, required: true, select: false },

    // Collected at registration by the marketing site's form; not required
    // by the auth flow itself.
    businessName: { type: String, trim: true },
    phone: { type: String, trim: true },
    platform: { type: String, enum: ["shopify", "woocommerce", "custom", "other"] },

    shopify: {
      shopDomain: { type: String },
      // AES-256-GCM ciphertext (see utils/token-encryption.ts) — never the
      // plaintext Shopify access token, and select: false so it is never
      // returned by a default query either.
      accessTokenEncrypted: { type: String, select: false },
      connectedAt: { type: Date },
    },

    // Populated only if/when a merchant is ever given their own WhatsApp
    // Business number; the MVP sends from one shared, platform-level
    // number (see integrations/whatsapp), so these stay unset for now.
    whatsapp: {
      phoneNumberId: { type: String },
      businessAccountId: { type: String },
      connectedAt: { type: Date },
    },

    settings: { type: merchantSettingsSchema, required: true, default: () => ({}) },
  },
  { timestamps: true },
);

// A Shopify store can only ever be connected to one Akedly merchant —
// webhook merchant-resolution (by shop domain) depends on this being
// unambiguous. Sparse: most merchants have no shopify.shopDomain yet.
merchantSchema.index({ "shopify.shopDomain": 1 }, { unique: true, sparse: true });

export type MerchantDocument = HydratedDocument<InferSchemaType<typeof merchantSchema>>;

export const Merchant = model("Merchant", merchantSchema);
