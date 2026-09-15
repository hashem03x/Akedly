import crypto from "node:crypto";
import { env } from "../../config/env";
import { AppError } from "../../utils/app-error";

const SHOP_DOMAIN_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

export function isValidShopDomain(shop: string): boolean {
  return SHOP_DOMAIN_PATTERN.test(shop);
}

function requireConfig(): { clientId: string; apiSecret: string; appUrl: string } {
  if (!env.shopifyClientId || !env.shopifyApiSecret || !env.shopifyAppUrl) {
    throw new AppError(
      503,
      "SHOPIFY_NOT_CONFIGURED",
      "SHOPIFY_CLIENT_ID / SHOPIFY_API_SECRET / SHOPIFY_APP_URL are not set",
    );
  }
  return { clientId: env.shopifyClientId, apiSecret: env.shopifyApiSecret, appUrl: env.shopifyAppUrl };
}

export function buildAuthorizeUrl(shop: string, state: string): string {
  const { clientId, appUrl } = requireConfig();
  const redirectUri = `${appUrl}/api/v1/integrations/shopify/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    scope: env.shopifyScopes,
    redirect_uri: redirectUri,
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

/**
 * Validates the Shopify OAuth callback query string: strip `hmac`, sort
 * the remaining params, HMAC-SHA256 them with the client secret, and
 * constant-time-compare against the provided value.
 */
export function verifyCallbackHmac(query: Record<string, string>): boolean {
  const { apiSecret } = requireConfig();
  const { hmac, ...rest } = query;
  if (!hmac) return false;

  const message = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join("&");

  const expected = crypto.createHmac("sha256", apiSecret).update(message).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(hmac);
  if (expectedBuf.length !== providedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

interface TokenExchangeResponse {
  access_token: string;
  scope: string;
}

export async function exchangeCodeForToken(shop: string, code: string): Promise<TokenExchangeResponse> {
  const { clientId, apiSecret } = requireConfig();

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: apiSecret, code }).toString(),
  });

  if (!response.ok) {
    throw new AppError(
      502,
      "SHOPIFY_TOKEN_EXCHANGE_FAILED",
      `Shopify token exchange failed with status ${response.status}`,
    );
  }

  return (await response.json()) as TokenExchangeResponse;
}
