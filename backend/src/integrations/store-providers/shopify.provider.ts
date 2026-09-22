import crypto from "crypto";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import type { NormalizedOrderInput } from "../../modules/orders/order.types";
import type {
  ConnectionTestResult,
  StoreConnectionInput,
  StoreProvider,
  SyncOrderStatusInput,
} from "./store-provider.interface";

interface ShopifyMoneySet {
  shop_money?: { amount?: string };
}

interface ShopifyLineItem {
  name?: string;
  title?: string;
  quantity?: number;
  price?: string;
}

interface ShopifyOrderPayload {
  id: number | string;
  name?: string;
  order_number?: number;
  customer?: { first_name?: string; last_name?: string };
  email?: string;
  phone?: string;
  shipping_address?: { phone?: string; name?: string };
  billing_address?: { phone?: string; name?: string };
  line_items?: ShopifyLineItem[];
  subtotal_price?: string;
  total_shipping_price_set?: ShopifyMoneySet;
  total_price?: string;
  currency?: string;
}

// --- GraphQL Admin API client -------------------------------------------------
//
// Shopify apps created after 2024-10-01 no longer get REST Admin API access by
// default — every REST call (including the previously-used GET /shop.json)
// returns 403 Forbidden regardless of granted scopes. The GraphQL Admin API
// remains available, so every Shopify Admin API call in this provider goes
// through it. See https://shopify.dev/docs/api/usage/access-scopes and the
// 2024-10 REST API deprecation notice in Shopify's app developer changelog.

interface ShopifyGraphQLError {
  message: string;
  extensions?: { code?: string };
}

interface ShopifyGraphQLEnvelope<T> {
  data?: T;
  errors?: ShopifyGraphQLError[];
}

type ShopifyApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; httpStatus?: number };

function graphqlUrl(domain: string): string {
  return `https://${domain}/admin/api/${env.shopify.apiVersion}/graphql.json`;
}

/**
 * POSTs a GraphQL query/mutation to the Shopify Admin API and returns a typed
 * result. On any failure (HTTP-level or GraphQL `errors`), logs safe diagnostics
 * — shop, status, method, path, API version, operation name, and the response
 * body Shopify returned — without ever logging the access token or any header.
 */
async function shopifyGraphQL<T>(
  domain: string,
  accessToken: string,
  operation: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<ShopifyApiResult<T>> {
  const urlPath = `/admin/api/${env.shopify.apiVersion}/graphql.json`;

  let res: Response;
  try {
    res = await fetch(graphqlUrl(domain), {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (err) {
    logger.error("Shopify Admin API request threw", {
      shop: domain,
      method: "POST",
      urlPath,
      apiVersion: env.shopify.apiVersion,
      operation,
      hasAccessToken: Boolean(accessToken),
      message: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed." };
  }

  const rawBody = await res.text();

  if (!res.ok) {
    logger.error("Shopify Admin API responded with a non-2xx status", {
      shop: domain,
      status: res.status,
      method: "POST",
      urlPath,
      apiVersion: env.shopify.apiVersion,
      operation,
      hasAccessToken: Boolean(accessToken),
      // Shopify's error bodies describe the problem (missing REST access, rate
      // limiting, etc.) and never contain our credentials — safe to log.
      responseBody: rawBody.slice(0, 2000),
      responseHeaders: {
        "content-type": res.headers.get("content-type"),
        "x-request-id": res.headers.get("x-request-id"),
      },
    });
    return {
      ok: false,
      error: `Shopify responded with status ${res.status}.`,
      httpStatus: res.status,
    };
  }

  let envelope: ShopifyGraphQLEnvelope<T>;
  try {
    envelope = JSON.parse(rawBody) as ShopifyGraphQLEnvelope<T>;
  } catch {
    logger.error("Shopify Admin API returned a non-JSON response", {
      shop: domain,
      status: res.status,
      urlPath,
      operation,
      responseBody: rawBody.slice(0, 500),
    });
    return { ok: false, error: "Shopify returned an invalid response." };
  }

  if (envelope.errors?.length) {
    // GraphQL reports failures (including "access denied"/missing-scope style
    // errors) with HTTP 200 and a top-level `errors` array — a 2xx status alone
    // does not mean the call succeeded.
    logger.error("Shopify GraphQL Admin API returned errors", {
      shop: domain,
      status: res.status,
      urlPath,
      apiVersion: env.shopify.apiVersion,
      operation,
      hasAccessToken: Boolean(accessToken),
      errors: envelope.errors.map((e) => ({ message: e.message, code: e.extensions?.code })),
    });
    return { ok: false, error: envelope.errors[0]?.message ?? "Shopify GraphQL error." };
  }

  return { ok: true, data: envelope.data as T };
}

interface UserError {
  field?: string[] | null;
  message: string;
}

function firstUserError(errors: UserError[] | undefined): string | undefined {
  return errors && errors.length > 0 ? errors.map((e) => e.message).join(", ") : undefined;
}

export class ShopifyProvider implements StoreProvider {
  readonly platform = "shopify";

  async testConnection(input: StoreConnectionInput): Promise<ConnectionTestResult> {
    if (!input.accessToken) {
      return { ok: false, error: "Missing Shopify access token." };
    }

    const result = await shopifyGraphQL<{
      shop: { name: string } | null;
      currentAppInstallation: { accessScopes: { handle: string }[] } | null;
    }>(
      input.domain,
      input.accessToken,
      "testConnection",
      `query TestConnection {
        shop { name }
        currentAppInstallation { accessScopes { handle } }
      }`
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    // Requested vs granted scopes can legitimately differ (Shopify does not
    // guarantee a declared scope was actually granted) — logging the granted
    // set on every successful test makes that diagnosable without ever
    // exposing the token itself.
    logger.info("Shopify connection test succeeded", {
      shop: input.domain,
      requestedScopes: env.shopify.scopes,
      grantedScopes: result.data.currentAppInstallation?.accessScopes.map((s) => s.handle) ?? [],
    });

    return { ok: true, storeName: result.data.shop?.name };
  }

  async registerWebhooks(input: StoreConnectionInput, callbackBaseUrl: string): Promise<void> {
    if (!input.accessToken) throw new Error("Missing Shopify access token.");

    const address = `${callbackBaseUrl}/api/v1/webhooks/shopify`;

    // Idempotency: skip creating a new subscription if one already points at this
    // exact address/topic (e.g. the merchant disconnects and reconnects the store).
    const existing = await shopifyGraphQL<{
      webhookSubscriptions: { edges: { node: { id: string } }[] };
    }>(
      input.domain,
      input.accessToken,
      "listWebhookSubscriptions",
      `query ListWebhooks($callbackUrl: URL!) {
        webhookSubscriptions(first: 1, topics: [ORDERS_CREATE], callbackUrl: $callbackUrl) {
          edges { node { id } }
        }
      }`,
      { callbackUrl: address }
    );

    if (existing.ok && existing.data.webhookSubscriptions.edges.length > 0) {
      return;
    }

    const created = await shopifyGraphQL<{
      webhookSubscriptionCreate: {
        webhookSubscription: { id: string } | null;
        userErrors: UserError[];
      };
    }>(
      input.domain,
      input.accessToken,
      "webhookSubscriptionCreate",
      `mutation CreateWebhook($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
          webhookSubscription { id }
          userErrors { field message }
        }
      }`,
      { topic: "ORDERS_CREATE", webhookSubscription: { callbackUrl: address, format: "JSON" } }
    );

    if (!created.ok) {
      throw new Error(`Failed to register Shopify webhook: ${created.error}`);
    }
    const userError = firstUserError(created.data.webhookSubscriptionCreate.userErrors);
    if (userError) {
      throw new Error(`Failed to register Shopify webhook: ${userError}`);
    }
  }

  /**
   * Converts a raw platform webhook payload into Akedly's internal order shape.
   * Webhook delivery payloads keep the same JSON shape regardless of whether the
   * subscription was created via REST or GraphQL, so this needs no changes for
   * the GraphQL migration above.
   */
  normalizeOrder(rawPayload: unknown): NormalizedOrderInput {
    const payload = rawPayload as ShopifyOrderPayload;

    const address = payload.shipping_address ?? payload.billing_address;
    const joinedName = [payload.customer?.first_name, payload.customer?.last_name]
      .filter(Boolean)
      .join(" ");
    const customerName = address?.name || joinedName || "Customer";

    const items = (payload.line_items ?? []).map((item) => ({
      name: item.name ?? item.title ?? "Item",
      quantity: item.quantity ?? 1,
      price: Number(item.price ?? 0),
    }));

    const shipping = Number(payload.total_shipping_price_set?.shop_money?.amount ?? 0);

    return {
      externalOrderId: String(payload.id),
      // Shopify's `name` already includes a leading "#" (e.g. "#1042"); strip it so
      // message templates that add their own "#" don't end up with "##1042".
      orderNumber: (payload.name ?? String(payload.order_number ?? payload.id)).replace(/^#/, ""),
      customer: {
        name: customerName,
        phone: address?.phone ?? payload.phone ?? "",
        email: payload.email,
      },
      items,
      subtotal: Number(payload.subtotal_price ?? 0),
      shipping,
      total: Number(payload.total_price ?? 0),
      currency: payload.currency ?? "USD",
    };
  }

  verifyWebhookSignature(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): boolean {
    const signature = headers["x-shopify-hmac-sha256"];
    if (!signature || typeof signature !== "string") return false;

    const computed = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
    try {
      return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  async syncOrderStatus(input: StoreConnectionInput, order: SyncOrderStatusInput): Promise<void> {
    if (!input.accessToken) throw new Error("Missing Shopify access token.");

    const tag = order.status === "confirmed" ? "akedly-confirmed" : "akedly-cancelled";
    const gid = `gid://shopify/Order/${order.externalOrderId}`;

    const result = await shopifyGraphQL<{
      tagsAdd: { userErrors: UserError[] };
    }>(
      input.domain,
      input.accessToken,
      "tagsAdd",
      `mutation AddOrderTag($id: ID!, $tags: [String!]!) {
        tagsAdd(id: $id, tags: $tags) {
          userErrors { field message }
        }
      }`,
      { id: gid, tags: [tag] }
    );

    if (!result.ok) {
      throw new Error(`Failed to sync order status to Shopify: ${result.error}`);
    }
    const userError = firstUserError(result.data.tagsAdd.userErrors);
    if (userError) {
      throw new Error(`Failed to sync order status to Shopify: ${userError}`);
    }
  }
}
