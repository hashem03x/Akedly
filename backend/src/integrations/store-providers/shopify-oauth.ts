import crypto from "crypto";
import { env } from "../../config/env";

const SHOP_DOMAIN_REGEX = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

/**
 * Accepts reasonable merchant input ("example.myshopify.com",
 * "https://example.myshopify.com/") and normalizes it to a bare shop domain.
 * Returns null for anything that isn't a real myshopify.com domain — this is
 * the only thing standing between a merchant-supplied string and an outbound
 * OAuth redirect, so it must reject arbitrary external hosts (SSRF guard).
 */
export function normalizeShopDomain(raw: string): string | null {
  const trimmed = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  return SHOP_DOMAIN_REGEX.test(trimmed) ? trimmed : null;
}

export function buildShopifyAuthorizeUrl(shop: string, state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: env.shopify.clientId,
    scope: env.shopify.scopes,
    redirect_uri: redirectUri,
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

/**
 * Thrown whenever Shopify tells us — definitively — that the stored credential
 * can no longer be used and the merchant must go through OAuth again:
 * - the stored credential predates this app's expiring-token migration
 *   (legacy non-expiring token; there's nothing to refresh), or
 * - the refresh token itself is invalid/expired/revoked (Shopify's documented
 *   401 `{ error: "invalid_request" }` response from the refresh endpoint).
 * Callers must not retry a refresh in a loop when they catch this — the fix is
 * merchant reauthorization, not another API call.
 */
export class ShopifyReauthorizationRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShopifyReauthorizationRequiredError";
  }
}

export interface ShopifyOfflineTokenResult {
  accessToken: string;
  scope: string;
  /** Present for expiring offline tokens; undefined for a legacy non-expiring token. */
  refreshToken?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
}

interface ShopifyTokenEndpointBody {
  access_token?: string;
  scope?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  error?: string;
  error_description?: string;
}

function secondsFromNow(seconds: number | undefined): Date | undefined {
  return typeof seconds === "number" ? new Date(Date.now() + seconds * 1000) : undefined;
}

function parseTokenResponse(body: ShopifyTokenEndpointBody): ShopifyOfflineTokenResult {
  if (!body.access_token) {
    throw new Error("Shopify token response did not include an access token.");
  }
  return {
    accessToken: body.access_token,
    scope: body.scope ?? "",
    refreshToken: body.refresh_token,
    accessTokenExpiresAt: secondsFromNow(body.expires_in),
    refreshTokenExpiresAt: secondsFromNow(body.refresh_token_expires_in),
  };
}

/**
 * Exchanges an OAuth authorization code for an *expiring* offline access token.
 * `expiring: "1"` is required — without it Shopify silently issues the legacy
 * non-expiring token, which the Admin API now rejects outright (see
 * https://shopify.dev/docs/apps/build/authentication-authorization/migrate-to-expiring-offline-access-tokens).
 */
export async function exchangeShopifyCodeForToken(
  shop: string,
  code: string
): Promise<ShopifyOfflineTokenResult> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.shopify.clientId,
      client_secret: env.shopify.clientSecret,
      code,
      expiring: "1",
    }),
  });

  if (!res.ok) {
    throw new Error(`Shopify token exchange failed with status ${res.status}`);
  }

  const body = (await res.json()) as ShopifyTokenEndpointBody;
  return parseTokenResponse(body);
}

/**
 * Exchanges a still-valid refresh token for a new expiring offline access token.
 * Shopify replaces the refresh token on every use — the caller must persist the
 * *new* refresh token, not keep reusing the old one.
 */
export async function refreshShopifyOfflineToken(
  shop: string,
  refreshToken: string
): Promise<ShopifyOfflineTokenResult> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: env.shopify.clientId,
      client_secret: env.shopify.clientSecret,
      refresh_token: refreshToken,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as ShopifyTokenEndpointBody;

  if (res.status === 401 && body.error === "invalid_request") {
    // Shopify's documented signal that the refresh token is dead (expired /
    // revoked / already superseded) — the merchant must reauthorize.
    throw new ShopifyReauthorizationRequiredError(
      "Shopify refresh token is no longer valid; merchant reauthorization is required."
    );
  }

  if (!res.ok) {
    throw new Error(`Shopify token refresh failed with status ${res.status}`);
  }

  return parseTokenResponse(body);
}

/**
 * Verifies the `hmac` Shopify signs onto OAuth authorize/callback query strings,
 * per Shopify's documented "verifying requests" algorithm: HMAC-SHA256 (hex) of the
 * remaining query params, sorted by key and joined as `key=value` pairs with `&`.
 */
export function verifyShopifyOAuthHmac(query: Record<string, unknown>): boolean {
  const entries = query as Record<string, string | undefined>;
  const { hmac } = entries;
  if (!hmac) return false;

  const message = Object.keys(entries)
    .filter((key) => key !== "hmac" && key !== "signature" && entries[key] !== undefined)
    .sort()
    .map((key) => `${key}=${entries[key]}`)
    .join("&");

  const computed = crypto.createHmac("sha256", env.shopify.clientSecret).update(message).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hmac));
  } catch {
    return false;
  }
}
