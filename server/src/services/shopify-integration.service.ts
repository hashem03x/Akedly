import crypto from "node:crypto";
import {
  buildAuthorizeUrl,
  exchangeCodeForToken,
  isValidShopDomain,
  verifyCallbackHmac,
} from "../integrations/shopify/shopify-oauth";
import { registerOrderWebhooks } from "../integrations/shopify/shopify-webhooks";
import { Merchant } from "../models/merchant.model";
import { AppError } from "../utils/app-error";
import { logger } from "../utils/logger";
import { encryptToken } from "../utils/token-encryption";

export const STATE_COOKIE_NAME = "shopify_oauth_state";
export const STATE_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

function buildInstallUrl(shop: string): { url: string; state: string } {
  if (!isValidShopDomain(shop)) {
    throw new AppError(400, "INVALID_SHOP_DOMAIN", "shop must be a valid *.myshopify.com domain");
  }
  const state = crypto.randomBytes(16).toString("hex");
  return { url: buildAuthorizeUrl(shop, state), state };
}

interface HandleCallbackInput {
  merchantId: string;
  shop: string;
  code: string;
  query: Record<string, string>;
  expectedState: string | undefined;
}

async function handleCallback(input: HandleCallbackInput): Promise<void> {
  const { merchantId, shop, code, query, expectedState } = input;

  if (!isValidShopDomain(shop)) {
    throw new AppError(400, "INVALID_SHOP_DOMAIN", "Invalid shop domain in callback");
  }
  if (!expectedState || expectedState !== query.state) {
    throw new AppError(400, "INVALID_OAUTH_STATE", "OAuth state mismatch — possible CSRF attempt");
  }
  if (!verifyCallbackHmac(query)) {
    throw new AppError(400, "INVALID_OAUTH_HMAC", "Shopify callback HMAC verification failed");
  }

  const existingOwner = await Merchant.findOne({ "shopify.shopDomain": shop });
  if (existingOwner && String(existingOwner._id) !== merchantId) {
    throw new AppError(
      409,
      "SHOP_ALREADY_CONNECTED",
      "This Shopify store is already connected to a different Akedly account",
    );
  }

  const { access_token } = await exchangeCodeForToken(shop, code);

  const merchant = await Merchant.findById(merchantId);
  if (!merchant) throw new AppError(404, "MERCHANT_NOT_FOUND", "Merchant not found");

  merchant.shopify = {
    shopDomain: shop,
    accessTokenEncrypted: encryptToken(access_token),
    connectedAt: new Date(),
  };
  await merchant.save();

  await registerOrderWebhooks(shop, access_token);
  logger.info("SHOPIFY", `Merchant ${merchantId} connected Shopify store ${shop}`);
}

async function getStatus(
  merchantId: string,
): Promise<{ connected: boolean; shopDomain?: string; connectedAt?: Date }> {
  const merchant = await Merchant.findById(merchantId);
  if (!merchant?.shopify?.shopDomain) return { connected: false };
  return {
    connected: true,
    shopDomain: merchant.shopify.shopDomain,
    connectedAt: merchant.shopify.connectedAt ?? undefined,
  };
}

async function disconnect(merchantId: string): Promise<void> {
  await Merchant.updateOne({ _id: merchantId }, { $unset: { shopify: "" } });
}

export const ShopifyIntegrationService = { buildInstallUrl, handleCallback, getStatus, disconnect };
