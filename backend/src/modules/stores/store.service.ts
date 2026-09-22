import crypto from "crypto";
import { env } from "../../config/env";
import { ApiError } from "../../utils/api-error";
import { decryptSecret, encryptSecret } from "../../utils/crypto";
import { getStoreProvider } from "../../integrations/store-providers";
import { StoreModel, type StoreDocument, type StorePlatform } from "./store.model";
import type { ConnectWooCommerceInput, UpdateStoreSettingsInput } from "./store.types";

const CREDENTIAL_FIELDS =
  "+credentials.accessToken +credentials.consumerKey +credentials.consumerSecret +credentials.webhookSecret";

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
 * Creates or updates the merchant's Shopify store from a completed OAuth exchange.
 * Reuses the exact same ShopifyProvider (testConnection/registerWebhooks) that the
 * rest of the app already depends on — OAuth only supplies the access token.
 *
 * Reconnecting the same shop (merchant re-authorizes, or the token is refreshed)
 * updates the existing Store record instead of creating a duplicate, since
 * (merchantId, platform, domain) is unique.
 */
export async function upsertShopifyStoreFromOAuth(
  merchantId: string,
  shop: string,
  accessToken: string
): Promise<StoreDocument> {
  const provider = getStoreProvider("shopify");
  const test = await provider.testConnection({ domain: shop, accessToken });
  if (!test.ok) {
    throw ApiError.badRequest("STORE_CONNECTION_FAILED", test.error ?? "Could not connect to Shopify.");
  }

  let store = await StoreModel.findOne({ merchantId, platform: "shopify", domain: shop });
  if (!store) {
    store = new StoreModel({ merchantId, platform: "shopify", domain: shop, name: test.storeName || shop });
  } else {
    store.name = test.storeName || store.name;
  }

  store.credentials = { accessToken: encryptSecret(accessToken) };
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
    await provider.registerWebhooks(
      {
        domain: store.domain,
        accessToken: store.credentials?.accessToken
          ? decryptSecret(store.credentials.accessToken)
          : undefined,
        consumerKey: store.credentials?.consumerKey
          ? decryptSecret(store.credentials.consumerKey)
          : undefined,
        consumerSecret: store.credentials?.consumerSecret
          ? decryptSecret(store.credentials.consumerSecret)
          : undefined,
      },
      env.backendUrl
    );
  } catch (err) {
    store.status = "error";
    store.lastConnectionError = err instanceof Error ? err.message : "Webhook registration failed.";
    await store.save();
  }
}

export async function testStoreConnection(merchantId: string, storeId: string): Promise<StoreDocument> {
  const store = await StoreModel.findOne({ _id: storeId, merchantId }).select(CREDENTIAL_FIELDS);
  if (!store) throw ApiError.notFound("Store not found.", "STORE_NOT_FOUND");

  const provider = getStoreProvider(store.platform as StorePlatform);
  const result = await provider.testConnection({
    domain: store.domain,
    accessToken: store.credentials?.accessToken ? decryptSecret(store.credentials.accessToken) : undefined,
    consumerKey: store.credentials?.consumerKey ? decryptSecret(store.credentials.consumerKey) : undefined,
    consumerSecret: store.credentials?.consumerSecret
      ? decryptSecret(store.credentials.consumerSecret)
      : undefined,
  });

  store.lastConnectionTestAt = new Date();
  store.status = result.ok ? "connected" : "error";
  store.lastConnectionError = result.ok ? undefined : result.error;
  await store.save();
  return store;
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
