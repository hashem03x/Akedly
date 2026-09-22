import type { NormalizedOrderInput } from "../../modules/orders/order.types";

export interface StoreConnectionInput {
  domain: string;
  accessToken?: string;
  consumerKey?: string;
  consumerSecret?: string;
}

export interface ConnectionTestResult {
  ok: boolean;
  storeName?: string;
  error?: string;
}

export interface SyncOrderStatusInput {
  externalOrderId: string;
  status: "confirmed" | "cancelled";
}

/**
 * Adapter that a specific e-commerce platform (Shopify, WooCommerce, ...) implements.
 * The rest of the app only depends on this interface, never on a platform SDK directly.
 */
export interface StoreProvider {
  readonly platform: string;

  testConnection(input: StoreConnectionInput): Promise<ConnectionTestResult>;

  /** Registers the webhooks Akedly needs (new order, etc.) on the merchant's store. */
  registerWebhooks(input: StoreConnectionInput, callbackBaseUrl: string): Promise<void>;

  /** Converts a raw platform webhook payload into Akedly's internal order shape. */
  normalizeOrder(rawPayload: unknown): NormalizedOrderInput;

  /** Verifies that a webhook request actually originated from this platform. */
  verifyWebhookSignature(rawBody: Buffer, headers: Record<string, string | string[] | undefined>, secret: string): boolean;

  /** Reflects the confirmation result back onto the order in the merchant's store. */
  syncOrderStatus(input: StoreConnectionInput, order: SyncOrderStatusInput): Promise<void>;
}
