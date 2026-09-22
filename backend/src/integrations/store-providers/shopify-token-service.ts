import { logger } from "../../utils/logger";
import { decryptSecret, encryptSecret } from "../../utils/crypto";
import { StoreModel } from "../../modules/stores/store.model";
import {
  refreshShopifyOfflineToken,
  ShopifyReauthorizationRequiredError,
  type ShopifyOfflineTokenResult,
} from "./shopify-oauth";

export { ShopifyReauthorizationRequiredError };

// Expiring offline tokens last ~1 hour (Shopify-documented); refresh with a
// safety margin so a request that's mid-flight when the token would otherwise
// expire never gets caught out.
const REFRESH_SAFETY_WINDOW_MS = 5 * 60 * 1000;

const CREDENTIAL_FIELDS = "+credentials.accessToken +credentials.refreshToken";

// Per-warm-instance de-dupe: if several Shopify API calls for the same store
// land in the same request/instance while a refresh is already in flight,
// they share one refresh instead of each firing their own. This does not
// coordinate across separate serverless instances — Shopify's refresh
// endpoint is itself documented as safely replayable for up to an hour after
// a refresh, so a rare cross-instance race is wasteful (an extra HTTP call)
// but never corrupts the stored credential. A distributed lock would be
// disproportionate for that risk profile.
const inFlightRefreshes = new Map<string, Promise<string>>();

async function persistRefreshedToken(storeId: string, token: ShopifyOfflineTokenResult): Promise<void> {
  // $set with `undefined` values is silently dropped by MongoDB (the field is
  // left untouched) — clearing a stale lastConnectionError needs an explicit $unset.
  await StoreModel.updateOne(
    { _id: storeId },
    {
      $set: {
        "credentials.accessToken": encryptSecret(token.accessToken),
        ...(token.refreshToken ? { "credentials.refreshToken": encryptSecret(token.refreshToken) } : {}),
        ...(token.accessTokenExpiresAt ? { "credentials.accessTokenExpiresAt": token.accessTokenExpiresAt } : {}),
        ...(token.refreshTokenExpiresAt
          ? { "credentials.refreshTokenExpiresAt": token.refreshTokenExpiresAt }
          : {}),
        status: "connected",
      },
      $unset: { lastConnectionError: "" },
    }
  );
}

async function markReauthRequired(storeId: string, reason: string): Promise<void> {
  logger.warn("Shopify store requires reauthorization", { storeId, reason });
  await StoreModel.updateOne(
    { _id: storeId },
    { $set: { status: "reauth_required", lastConnectionError: reason } }
  );
}

async function doRefresh(storeId: string, shop: string, encryptedRefreshToken: string): Promise<string> {
  const refreshToken = decryptSecret(encryptedRefreshToken);

  try {
    const refreshed = await refreshShopifyOfflineToken(shop, refreshToken);
    await persistRefreshedToken(storeId, refreshed);
    logger.info("Shopify offline access token refreshed", {
      shop,
      storeId,
      accessTokenExpiresAt: refreshed.accessTokenExpiresAt?.toISOString(),
      refreshTokenExpiresAt: refreshed.refreshTokenExpiresAt?.toISOString(),
    });
    return refreshed.accessToken;
  } catch (err) {
    if (err instanceof ShopifyReauthorizationRequiredError) {
      await markReauthRequired(storeId, err.message);
    } else {
      logger.error("Shopify offline access token refresh failed", {
        shop,
        storeId,
        message: (err as Error).message,
      });
    }
    throw err;
  }
}

/**
 * Returns a currently-valid Shopify Admin API access token for the given
 * store, refreshing it first if it's missing, expired, or expiring soon.
 *
 * Every Shopify Admin API call in the app goes through this — nothing should
 * read `store.credentials.accessToken` directly and assume it's still valid.
 *
 * Throws `ShopifyReauthorizationRequiredError` (and marks the store
 * `reauth_required`) when:
 * - the stored credential predates the expiring-token migration (no
 *   `accessTokenExpiresAt` recorded at all — nothing to refresh), or
 * - there's no refresh token, or the refresh token itself has expired, or
 * - Shopify's refresh endpoint reports the refresh token is no longer valid.
 */
export async function getValidShopifyAccessToken(storeId: string): Promise<string> {
  const store = await StoreModel.findById(storeId).select(CREDENTIAL_FIELDS);
  if (!store) {
    throw new Error("Store not found.");
  }
  if (!store.credentials?.accessToken) {
    throw new Error("Shopify store has no stored access token.");
  }

  const { accessTokenExpiresAt, refreshTokenExpiresAt, refreshToken } = store.credentials;

  // Legacy credential: created before this app requested expiring tokens.
  // There is nothing to refresh — Shopify no longer accepts it at all for the
  // Admin API, so surfacing that plainly (rather than pretending it's fine)
  // is the correct behavior.
  if (!accessTokenExpiresAt) {
    await markReauthRequired(
      storeId,
      "Legacy non-expiring Shopify access token — reauthorization required."
    );
    throw new ShopifyReauthorizationRequiredError(
      "Store has a legacy non-expiring Shopify token; reauthorization is required."
    );
  }

  const needsRefresh = accessTokenExpiresAt.getTime() - Date.now() <= REFRESH_SAFETY_WINDOW_MS;
  if (!needsRefresh) {
    return decryptSecret(store.credentials.accessToken);
  }

  if (!refreshToken || (refreshTokenExpiresAt && refreshTokenExpiresAt.getTime() <= Date.now())) {
    await markReauthRequired(storeId, "Shopify refresh token missing or expired.");
    throw new ShopifyReauthorizationRequiredError(
      "Shopify refresh token is missing or expired; reauthorization is required."
    );
  }

  const existing = inFlightRefreshes.get(storeId);
  if (existing) {
    return existing;
  }

  const refreshPromise = doRefresh(storeId, store.domain, refreshToken).finally(() => {
    inFlightRefreshes.delete(storeId);
  });
  inFlightRefreshes.set(storeId, refreshPromise);
  return refreshPromise;
}
