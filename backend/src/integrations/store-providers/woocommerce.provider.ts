import crypto from "crypto";
import type { NormalizedOrderInput } from "../../modules/orders/order.types";
import type {
  ConnectionTestResult,
  StoreConnectionInput,
  StoreProvider,
  SyncOrderStatusInput,
} from "./store-provider.interface";

interface WooLineItem {
  name?: string;
  quantity?: number;
  price?: string | number;
  total?: string;
}

interface WooOrderPayload {
  id: number | string;
  number?: string;
  billing?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
  };
  line_items?: WooLineItem[];
  total?: string;
  shipping_total?: string;
  currency?: string;
}

function baseUrl(domain: string): string {
  const withProtocol = domain.startsWith("http") ? domain : `https://${domain}`;
  return withProtocol.replace(/\/+$/, "");
}

function authHeader(consumerKey: string, consumerSecret: string): string {
  return "Basic " + Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
}

export class WooCommerceProvider implements StoreProvider {
  readonly platform = "woocommerce";

  async testConnection(input: StoreConnectionInput): Promise<ConnectionTestResult> {
    if (!input.consumerKey || !input.consumerSecret) {
      return { ok: false, error: "Missing WooCommerce API credentials." };
    }
    try {
      const res = await fetch(`${baseUrl(input.domain)}/wp-json/wc/v3/`, {
        headers: { Authorization: authHeader(input.consumerKey, input.consumerSecret) },
      });
      if (!res.ok) {
        return { ok: false, error: `WooCommerce responded with status ${res.status}.` };
      }
      return { ok: true, storeName: input.domain };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Connection failed." };
    }
  }

  async registerWebhooks(input: StoreConnectionInput, callbackBaseUrl: string): Promise<void> {
    if (!input.consumerKey || !input.consumerSecret) {
      throw new Error("Missing WooCommerce API credentials.");
    }
    const delivery_url = `${callbackBaseUrl}/api/v1/webhooks/woocommerce`;
    const res = await fetch(`${baseUrl(input.domain)}/wp-json/wc/v3/webhooks`, {
      method: "POST",
      headers: {
        Authorization: authHeader(input.consumerKey, input.consumerSecret),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Akedly - order created",
        topic: "order.created",
        delivery_url,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to register WooCommerce webhook: ${res.status} ${text}`);
    }
  }

  normalizeOrder(rawPayload: unknown): NormalizedOrderInput {
    const payload = rawPayload as WooOrderPayload;

    // externalOrderId is the sole uniqueness/idempotency key for every order this
    // provider ingests (see order.model.ts's storeId+externalOrderId unique index) —
    // an order must never be persisted without a real, stable WooCommerce id.
    if (payload.id === undefined || payload.id === null || String(payload.id).length === 0) {
      throw new Error('WooCommerce order payload is missing a stable order id ("id").');
    }

    const items = (payload.line_items ?? []).map((item) => ({
      name: item.name ?? "Item",
      quantity: item.quantity ?? 1,
      price: Number(item.price ?? item.total ?? 0),
    }));

    const total = Number(payload.total ?? 0);
    const shipping = Number(payload.shipping_total ?? 0);

    return {
      externalOrderId: String(payload.id),
      orderNumber: payload.number ?? String(payload.id),
      customer: {
        name: [payload.billing?.first_name, payload.billing?.last_name]
          .filter(Boolean)
          .join(" ") || "Customer",
        phone: payload.billing?.phone ?? "",
        email: payload.billing?.email,
      },
      items,
      subtotal: total - shipping,
      shipping,
      total,
      currency: payload.currency ?? "USD",
    };
  }

  verifyWebhookSignature(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
    secret: string
  ): boolean {
    const signature = headers["x-wc-webhook-signature"];
    if (!signature || typeof signature !== "string") return false;

    const computed = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
    try {
      return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  async syncOrderStatus(input: StoreConnectionInput, order: SyncOrderStatusInput): Promise<void> {
    if (!input.consumerKey || !input.consumerSecret) {
      throw new Error("Missing WooCommerce API credentials.");
    }
    const status = order.status === "confirmed" ? "processing" : "cancelled";
    const res = await fetch(`${baseUrl(input.domain)}/wp-json/wc/v3/orders/${order.externalOrderId}`, {
      method: "PUT",
      headers: {
        Authorization: authHeader(input.consumerKey, input.consumerSecret),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      throw new Error(`Failed to sync order status to WooCommerce: ${res.status}`);
    }
  }
}
