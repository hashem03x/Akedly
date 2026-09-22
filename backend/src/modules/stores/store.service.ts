import crypto from "crypto";
import { env } from "../../config/env";
import { ApiError } from "../../utils/api-error";
import { decryptSecret, encryptSecret } from "../../utils/crypto";
import { getStoreProvider } from "../../integrations/store-providers";
import type { StoreConnectionInput } from "../../integrations/store-providers/store-provider.interface";
import {
  getValidShopifyAccessToken,
  ShopifyReauthorizationRequiredError,
} from "../../integrations/store-providers/shopify-token-service";
import type { ShopifyOfflineTokenResult } from "../../integrations/store-providers/shopify-oauth";
import { StoreModel, type StoreDocument, type StorePlatform } from "./store.model";
import type { ConnectWooCommerceInput, UpdateStoreSettingsInput } from "./store.types";

const CREDENTIAL_FIELDS =
  "+credentials.accessToken +credentials.refreshToken +credentials.consumerKey +credentials.consumerSecret +credentials.webhookSecret";

export async function listStoresForMerchant(merchantId: string): Promise<StoreDocument[]> {
  return StoreModel.find({ merchantId }).sort({ createdAt: -1 });
}

export async function getOwnedStore(merchantId: string, storeId: string): Promise<StoreDocument> {
  const store = await StoreModel.findOne({ _id: storeId, merchantId });
  if (!store) {
    throw ApiError.notFound("Store not found.", "STORE_NOT_FOUND");
  }
  return store;
}

/**
 * Builds the credential input a StoreProvider needs for this store, resolving
 * Shopify's access token through the centralized expiring-token lifecycle
 * (refreshing it first if it's missing/expired/expiring soon) rather than ever
 * reading a possibly-stale `store.credentials.accessToken` directly.
 * WooCommerce credentials don't expire, so those are decrypted as-is.
 */
async function buildStoreConnectionInput(store: StoreDocument): Promise<StoreConnectionInput> {
  if (store.platform === "shopify") {
    const accessToken = await getValidShopifyAccessToken(store.id);
    return { domain: store.domain, accessToken };
  }

  return {
    domain: store.domain,
    consumerKey: store.credentials?.consumerKey ? decryptSecret(store.credentials.consumerKey) : undefined,
    consumerSecret: store.credentials?.consumerSecret
      ? decryptSecret(store.credentials.consumerSecret)
      : undefined,
  };
}

/**
 * Creates or updates the merchant's Shopify store from a completed OAuth exchange.
 * Reuses the exact same ShopifyProvider (testConnection/registerWebhooks) that the
 * rest of the app already depends on — OAuth only supplies the token.
 *
 * Reconnecting the same shop (merchant re-authorizes, or a legacy credential is
 * being replaced) updates the existing Store record instead of creating a
 * duplicate, since (merchantId, platform, domain) is unique.
 *
 * The freshly-exchanged token is used directly for the initial connection test —
 * there's no prior stored credential to resolve via the token lifecycle service
 * yet, and this is the one place a fresh (not-yet-persisted) token is legitimately
 * used without going through getValidShopifyAccessToken.
 */
export async function upsertShopifyStoreFromOAuth(
  merchantId: string,
  shop: string,
  token: ShopifyOfflineTokenResult
): Promise<StoreDocument> {
  const provider = getStoreProvider("shopify");
  const test = await provider.testConnection({ domain: shop, accessToken: token.accessToken });
  if (!test.ok) {
    throw ApiError.badRequest("STORE_CONNECTION_FAILED", test.error ?? "Could not connect to Shopify.");
  }

  let store = await StoreModel.findOne({ merchantId, platform: "shopify", domain: shop });
  if (!store) {
    store = new StoreModel({ merchantId, platform: "shopify", domain: shop, name: test.storeName || shop });
  } else {
    store.name = test.storeName || store.name;
  }

  store.credentials = {
    accessToken: encryptSecret(token.accessToken),
    refreshToken: token.refreshToken ? encryptSecret(token.refreshToken) : undefined,
    accessTokenExpiresAt: token.accessTokenExpiresAt,
    refreshTokenExpiresAt: token.refreshTokenExpiresAt,
  };
  store.status = "connected";
  store.lastConnectionTestAt = new Date();
  store.lastConnectionError = undefined;
  await store.save();

  await registerStoreWebhooks(store.id);
  return store;
}

export async function connectWooCommerceStore(
  merchantId: string,
  input: ConnectWooCommerceInput
): Promise<StoreDocument> {
  const provider = getStoreProvider("woocommerce");
  const test = await provider.testConnection({
    domain: input.domain,
    consumerKey: input.consumerKey,
    consumerSecret: input.consumerSecret,
  });
  if (!test.ok) {
    throw ApiError.badRequest(
      "STORE_CONNECTION_FAILED",
      test.error ?? "Could not connect to WooCommerce."
    );
  }

  const webhookSecret = crypto.randomBytes(24).toString("hex");

  const store = await StoreModel.create({
    merchantId,
    platform: "woocommerce",
    name: input.name,
    domain: input.domain,
    credentials: {
      consumerKey: encryptSecret(input.consumerKey),
      consumerSecret: encryptSecret(input.consumerSecret),
      webhookSecret: encryptSecret(webhookSecret),
    },
    status: "connected",
    lastConnectionTestAt: new Date(),
  });

  await registerStoreWebhooks(store.id);
  return store;
}

async function registerStoreWebhooks(storeId: string): Promise<void> {
  const store = await StoreModel.findById(storeId).select(CREDENTIAL_FIELDS);
  if (!store) return;

  const provider = getStoreProvider(store.platform as StorePlatform);

  try {
    const input = await buildStoreConnectionInput(store);
    await provider.registerWebhooks(input, env.backendUrl);
  } catch (err) {
    // A reauth requirement was already recorded by the token service itself;
    // don't downgrade that clearer status to a generic "error" here.
    if (!(err instanceof ShopifyReauthorizationRequiredError)) {
      store.status = "error";
      store.lastConnectionError = err instanceof Error ? err.message : "Webhook registration failed.";
      await store.save();
    }
  }
}

export async function testStoreConnection(merchantId: string, storeId: string): Promise<StoreDocument> {
  const store = await StoreModel.findOne({ _id: storeId, merchantId }).select(CREDENTIAL_FIELDS);
  if (!store) throw ApiError.notFound("Store not found.", "STORE_NOT_FOUND");

  const provider = getStoreProvider(store.platform as StorePlatform);

  try {
    const input = await buildStoreConnectionInput(store);
    const result = await provider.testConnection(input);

    store.lastConnectionTestAt = new Date();
    store.status = result.ok ? "connected" : "error";
    store.lastConnectionError = result.ok ? undefined : result.error;
    await store.save();
    return store;
  } catch (err) {
    if (err instanceof ShopifyReauthorizationRequiredError) {
      // Status/lastConnectionError were already set by the token service;
      // re-read so the caller gets the persisted state back.
      const refreshed = await StoreModel.findById(storeId);
      return refreshed ?? store;
    }
    throw err;
  }
}

export async function disconnectStore(merchantId: string, storeId: string): Promise<StoreDocument> {
  const store = await getOwnedStore(merchantId, storeId);
  store.status = "disconnected";
  await store.save();
  return store;
}

export async function updateStoreSettings(
  merchantId: string,
  storeId: string,
  input: UpdateStoreSettingsInput
): Promise<StoreDocument> {
  const store = await getOwnedStore(merchantId, storeId);
  store.settings = { ...store.settings, ...input };
  await store.save();
  return store;
}

export { buildStoreConnectionInput };
