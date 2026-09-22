import crypto from "crypto";
import type { Request, Response } from "express";
import { env } from "../../config/env";
import { asyncHandler } from "../../middleware/error.middleware";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { logger } from "../../utils/logger";
import { MerchantModel } from "../merchants/merchant.model";
import {
  buildShopifyAuthorizeUrl,
  exchangeShopifyCodeForToken,
  normalizeShopDomain,
  verifyShopifyOAuthHmac,
} from "../../integrations/store-providers/shopify-oauth";
import { ShopifyOAuthStateModel } from "./shopify-oauth-state.model";
import { upsertShopifyStoreFromOAuth } from "./store.service";

const STATE_TTL_MS = 10 * 60 * 1000;

function callbackUrl(): string {
  return `${env.backendUrl}/api/v1/integrations/shopify/oauth/callback`;
}

/** Every failure path here lands the merchant back on the dashboard with a safe, predefined code. */
function redirectToStoresError(res: Response, code: string) {
  res.redirect(`${env.frontendUrl}/dashboard/stores?shopify=error&code=${code}`);
}

export const startShopifyOAuth = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!env.shopify.clientId || !env.shopify.clientSecret) {
      logger.error("Shopify OAuth start requested but SHOPIFY_CLIENT_ID/SECRET are not configured.");
      return redirectToStoresError(res, "shopify_not_configured");
    }

    const rawShop = typeof req.query.shop === "string" ? req.query.shop : "";
    const shop = normalizeShopDomain(rawShop);
    if (!shop) {
      return redirectToStoresError(res, "invalid_shop");
    }

    const state = crypto.randomBytes(32).toString("hex");
    await ShopifyOAuthStateModel.create({
      state,
      merchantId: req.merchantId,
      shop,
      expiresAt: new Date(Date.now() + STATE_TTL_MS),
    });

    const authorizeUrl = buildShopifyAuthorizeUrl(shop, state, callbackUrl());
    res.redirect(authorizeUrl);
  } catch (err) {
    logger.error("Failed to start Shopify OAuth", { message: (err as Error).message });
    redirectToStoresError(res, "server_error");
  }
});

export const shopifyOAuthCallback = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { shop: rawShop, code, state, error } = req.query as Record<string, string | undefined>;

    if (error) {
      logger.info("Shopify OAuth authorization denied", { shop: rawShop, error });
      return redirectToStoresError(res, "authorization_denied");
    }
    if (!rawShop || !code || !state) {
      return redirectToStoresError(res, "invalid_callback");
    }

    const shop = normalizeShopDomain(rawShop);
    if (!shop) {
      return redirectToStoresError(res, "invalid_shop");
    }

    if (!verifyShopifyOAuthHmac(req.query as Record<string, unknown>)) {
      logger.error("Shopify OAuth callback HMAC verification failed", { shop });
      return redirectToStoresError(res, "invalid_signature");
    }

    // Atomically claim the state (usedAt: null -> now) so a replayed/duplicated
    // callback request can never be processed twice, even under a race.
    const oauthState = await ShopifyOAuthStateModel.findOneAndUpdate(
      { state, usedAt: null },
      { $set: { usedAt: new Date() } }
    );

    if (!oauthState) {
      const existing = await ShopifyOAuthStateModel.findOne({ state });
      return redirectToStoresError(res, existing ? "state_already_used" : "invalid_state");
    }
    if (oauthState.expiresAt.getTime() < Date.now()) {
      return redirectToStoresError(res, "state_expired");
    }
    if (oauthState.shop !== shop) {
      logger.error("Shopify OAuth callback shop mismatch", { expected: oauthState.shop, received: shop });
      return redirectToStoresError(res, "invalid_state");
    }

    const merchant = await MerchantModel.findById(oauthState.merchantId);
    if (!merchant) {
      return redirectToStoresError(res, "merchant_not_found");
    }

    let accessToken: string;
    try {
      const exchanged = await exchangeShopifyCodeForToken(shop, code);
      accessToken = exchanged.accessToken;
    } catch (err) {
      logger.error("Shopify OAuth token exchange failed", { shop, message: (err as Error).message });
      return redirectToStoresError(res, "oauth_exchange_failed");
    }

    try {
      await upsertShopifyStoreFromOAuth(merchant.id, shop, accessToken);
    } catch (err) {
      logger.error("Failed to finalize Shopify store connection after OAuth", {
        shop,
        message: (err as Error).message,
      });
      return redirectToStoresError(res, "connection_failed");
    }

    if (!merchant.onboardingCompleted) {
      merchant.onboardingCompleted = true;
      await merchant.save();
    }

    res.redirect(`${env.frontendUrl}/dashboard/stores?shopify=connected&store=${encodeURIComponent(shop)}`);
  } catch (err) {
    logger.error("Unexpected error in Shopify OAuth callback", { message: (err as Error).message });
    redirectToStoresError(res, "server_error");
  }
});
