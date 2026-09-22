import type { StorePlatform } from "../../modules/stores/store.model";
import type { StoreProvider } from "./store-provider.interface";
import { ShopifyProvider } from "./shopify.provider";
import { WooCommerceProvider } from "./woocommerce.provider";

const providers: Record<StorePlatform, StoreProvider> = {
  shopify: new ShopifyProvider(),
  woocommerce: new WooCommerceProvider(),
};

export function getStoreProvider(platform: StorePlatform): StoreProvider {
  const provider = providers[platform];
  if (!provider) {
    throw new Error(`No store provider registered for platform "${platform}".`);
  }
  return provider;
}

export type { StoreProvider, StoreConnectionInput, ConnectionTestResult } from "./store-provider.interface";
