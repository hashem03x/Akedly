import { asyncHandler } from "../../middleware/error.middleware";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { sendSuccess } from "../../utils/api-response";
import { toStoreDto } from "./store.dto";
import * as storeService from "./store.service";
import { connectWooCommerceStoreSchema, updateStoreSettingsSchema } from "./store.validation";

export const listStores = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const stores = await storeService.listStoresForMerchant(req.merchantId!);
  sendSuccess(res, { stores: stores.map(toStoreDto) });
});

// Shopify no longer connects through a manually pasted access token — see
// shopify-oauth.controller.ts for the OAuth start/callback flow that replaces it.

export const connectWooCommerce = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const input = connectWooCommerceStoreSchema.parse(req.body);
  const store = await storeService.connectWooCommerceStore(req.merchantId!, input);
  sendSuccess(res, { store: toStoreDto(store) }, 201);
});

export const testConnection = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const store = await storeService.testStoreConnection(req.merchantId!, req.params.storeId);
  sendSuccess(res, { store: toStoreDto(store) });
});

export const disconnect = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const store = await storeService.disconnectStore(req.merchantId!, req.params.storeId);
  sendSuccess(res, { store: toStoreDto(store) });
});

export const updateSettings = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const input = updateStoreSettingsSchema.parse(req.body);
  const store = await storeService.updateStoreSettings(req.merchantId!, req.params.storeId, input);
  sendSuccess(res, { store: toStoreDto(store) });
});

export const getStore = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const store = await storeService.getOwnedStore(req.merchantId!, req.params.storeId);
  sendSuccess(res, { store: toStoreDto(store) });
});
