import crypto from "crypto";
import request from "supertest";

// IMPORTANT: process.env must be set before anything that transitively imports
// config/env.ts is required — ES `import` statements are hoisted above plain
// statements, so any local-module `import` here would load env.ts too early.
// Local modules are pulled in via require() below instead.
export {};
process.env.SHOPIFY_CLIENT_SECRET = "test-shopify-secret";
process.env.WHATSAPP_PROVIDER = "mock";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createApp } = require("../app");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { MerchantModel } = require("../modules/merchants/merchant.model");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { StoreModel } = require("../modules/stores/store.model");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { OrderModel } = require("../modules/orders/order.model");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { CommunicationModel } = require("../modules/communications/communication.model");

const SECRET = "test-shopify-secret";

function sign(rawBody: string): string {
  return crypto.createHmac("sha256", SECRET).update(Buffer.from(rawBody)).digest("base64");
}

async function createStore(overrides: Record<string, unknown> = {}) {
  const merchant = await MerchantModel.create({
    name: "Test Merchant",
    email: `merchant_${Date.now()}_${Math.random()}@example.com`,
    passwordHash: "hash",
  });
  return StoreModel.create({
    merchantId: merchant._id,
    platform: "shopify",
    name: "Leopard",
    domain: "dev-akedly.myshopify.com",
    status: "connected",
    ...overrides,
  });
}

function orderPayload(id: number | string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: `#${id}`,
    customer: { first_name: "Ahmed", last_name: "Ali" },
    shipping_address: { phone: "+201001234567", name: "Ahmed Ali" },
    line_items: [{ name: "Nike T-Shirt", quantity: 1, price: "725.00" }],
    subtotal_price: "725.00",
    total_price: "725.00",
    currency: "EGP",
    ...overrides,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function postWebhook(
  app: any,
  body: unknown,
  headers: { domain?: string; topic?: string; webhookId?: string; skipSignature?: boolean } = {}
) {
  const raw = JSON.stringify(body);
  const req = request(app).post("/api/v1/webhooks/shopify").set("Content-Type", "application/json");
  if (headers.domain !== undefined) req.set("x-shopify-shop-domain", headers.domain);
  if (headers.topic !== undefined) req.set("x-shopify-topic", headers.topic);
  if (headers.webhookId !== undefined) req.set("x-shopify-webhook-id", headers.webhookId);
  if (!headers.skipSignature) req.set("x-shopify-hmac-sha256", sign(raw));
  return req.send(raw);
}

describe("Shopify orders/create webhook — end-to-end", () => {
  const app = createApp();

  it("creates the order and sends a WhatsApp confirmation when auto-confirmation is enabled", async () => {
    const store = await createStore();

    const res = await postWebhook(app, orderPayload(5001), {
      domain: store.domain,
      topic: "orders/create",
      webhookId: "wh-5001",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.created).toBe(true);

    const order = await OrderModel.findOne({ storeId: store._id, externalOrderId: "5001" });
    expect(order).not.toBeNull();
    expect(order.orderNumber).toBe("5001"); // leading "#" stripped, no double "#"

    const sent = await CommunicationModel.findOne({
      orderId: order._id,
      channel: "whatsapp",
      type: "confirmation_sent",
    });
    expect(sent).not.toBeNull();
    expect(sent.status).toBe("sent");
  });

  it("does not send a WhatsApp confirmation when the store has auto-confirmation disabled", async () => {
    const store = await createStore({ settings: { autoConfirmationEnabled: false } });

    const res = await postWebhook(app, orderPayload(5002), {
      domain: store.domain,
      topic: "orders/create",
      webhookId: "wh-5002",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.created).toBe(true);

    const order = await OrderModel.findOne({ storeId: store._id, externalOrderId: "5002" });
    expect(order).not.toBeNull();
    expect(order.confirmationStatus).toBe("pending");

    const sent = await CommunicationModel.findOne({ orderId: order._id, channel: "whatsapp" });
    expect(sent).toBeNull();
  });

  it("deduplicates a retried delivery (same X-Shopify-Webhook-Id): one order, one confirmation", async () => {
    const store = await createStore();
    const headers = { domain: store.domain, topic: "orders/create", webhookId: "wh-5003" };

    const first = await postWebhook(app, orderPayload(5003), headers);
    const retry = await postWebhook(app, orderPayload(5003), headers);

    expect(first.status).toBe(200);
    expect(retry.status).toBe(200);
    expect(retry.body.data.deduplicated).toBe(true);

    const orderCount = await OrderModel.countDocuments({ storeId: store._id, externalOrderId: "5003" });
    expect(orderCount).toBe(1);

    const order = await OrderModel.findOne({ storeId: store._id, externalOrderId: "5003" });
    const sentCount = await CommunicationModel.countDocuments({
      orderId: order._id,
      channel: "whatsapp",
      type: "confirmation_sent",
    });
    expect(sentCount).toBe(1);
  });

  it("does not duplicate an order or resend a confirmation when the same order arrives under a different webhook id", async () => {
    const store = await createStore();

    const first = await postWebhook(app, orderPayload(5004), {
      domain: store.domain,
      topic: "orders/create",
      webhookId: "wh-5004-a",
    });
    const second = await postWebhook(app, orderPayload(5004), {
      domain: store.domain,
      topic: "orders/create",
      webhookId: "wh-5004-b",
    });

    expect(first.body.data.created).toBe(true);
    expect(second.body.data.created).toBe(false);

    const orderCount = await OrderModel.countDocuments({ storeId: store._id, externalOrderId: "5004" });
    expect(orderCount).toBe(1);

    const order = await OrderModel.findOne({ storeId: store._id, externalOrderId: "5004" });
    const sentCount = await CommunicationModel.countDocuments({
      orderId: order._id,
      channel: "whatsapp",
      type: "confirmation_sent",
    });
    expect(sentCount).toBe(1);
  });

  it("acknowledges with 200 and does nothing for a topic other than orders/create", async () => {
    const store = await createStore();

    const res = await postWebhook(app, orderPayload(5005), {
      domain: store.domain,
      topic: "orders/updated",
      webhookId: "wh-5005",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.ignored).toBe(true);

    const order = await OrderModel.findOne({ storeId: store._id, externalOrderId: "5005" });
    expect(order).toBeNull();
  });
});
