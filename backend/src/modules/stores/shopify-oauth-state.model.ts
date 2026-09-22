import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

/**
 * Short-lived, single-use record binding a Shopify OAuth `state` value to the
 * authenticated Akedly merchant who started the flow. Vercel serverless functions
 * don't share in-memory state between invocations, so this has to be durable
 * (Mongo) rather than kept in process memory between /oauth/start and /oauth/callback.
 */
const shopifyOAuthStateSchema = new Schema(
  {
    state: { type: String, required: true, unique: true },
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant", required: true },
    shop: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// TTL index: Mongo automatically removes documents once expiresAt has passed.
shopifyOAuthStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type ShopifyOAuthState = InferSchemaType<typeof shopifyOAuthStateSchema>;
export type ShopifyOAuthStateDocument = HydratedDocument<ShopifyOAuthState>;

export const ShopifyOAuthStateModel = model("ShopifyOAuthState", shopifyOAuthStateSchema);
