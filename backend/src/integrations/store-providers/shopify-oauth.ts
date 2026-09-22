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

export interface ShopifyTokenExchangeResult {
  accessToken: string;
  scope: string;
}

export async function exchangeShopifyCodeForToken(
  shop: string,
  code: string
): Promise<ShopifyTokenExchangeResult> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.shopify.clientId,
      client_secret: env.shopify.clientSecret,
      code,
    }),
  });

  if (!res.ok) {
    throw new Error(`Shopify token exchange failed with status ${res.status}`);
  }

  const body = (await res.json()) as { access_token?: string; scope?: string };
  if (!body.access_token) {
    throw new Error("Shopify token exchange response did not include an access token.");
  }

  return { accessToken: body.access_token, scope: body.scope ?? "" };
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
