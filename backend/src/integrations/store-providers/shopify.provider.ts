import crypto from "crypto";
import { env } from "../../config/env";
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

function adminApiUrl(domain: string, path: string): string {
  return `https://${domain}/admin/api/${env.shopify.apiVersion}/${path}`;
}

export class ShopifyProvider implements StoreProvider {
  readonly platform = "shopify";

  async testConnection(input: StoreConnectionInput): Promise<ConnectionTestResult> {
    if (!input.accessToken) {
      return { ok: false, error: "Missing Shopify access token." };
    }
    try {
      const res = await fetch(adminApiUrl(input.domain, "shop.json"), {
        headers: { "X-Shopify-Access-Token": input.accessToken },
      });
      if (!res.ok) {
        return { ok: false, error: `Shopify responded with status ${res.status}.` };
      }
      const body = (await res.json()) as { shop?: { name?: string } };
      return { ok: true, storeName: body.shop?.name };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Connection failed." };
    }
  }

  async registerWebhooks(input: StoreConnectionInput, callbackBaseUrl: string): Promise<void> {
    if (!input.accessToken) throw new Error("Missing Shopify access token.");

    const topic = "orders/create";
    const address = `${callbackBaseUrl}/api/v1/webhooks/shopify`;

    // Idempotency: skip creating a new subscription if one already points at this
    // exact address/topic (e.g. the merchant disconnects and reconnects the store).
    const listRes = await fetch(
      adminApiUrl(input.domain, `webhooks.json?address=${encodeURIComponent(address)}&topic=${topic}`),
      { headers: { "X-Shopify-Access-Token": input.accessToken } }
    );
    if (listRes.ok) {
      const existing = (await listRes.json()) as { webhooks?: unknown[] };
      if (existing.webhooks && existing.webhooks.length > 0) {
        return;
      }
    }

    const res = await fetch(adminApiUrl(input.domain, "webhooks.json"), {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": input.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        webhook: { topic, address, format: "json" },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to register Shopify webhook: ${res.status} ${text}`);
    }
  }

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
    const res = await fetch(adminApiUrl(input.domain, `orders/${order.externalOrderId}.json`), {
      method: "PUT",
      headers: {
        "X-Shopify-Access-Token": input.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ order: { id: order.externalOrderId, tags: tag } }),
    });

    if (!res.ok) {
      throw new Error(`Failed to sync order status to Shopify: ${res.status}`);
    }
  }
}
