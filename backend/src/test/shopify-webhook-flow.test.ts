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
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { WebhookEventModel } = require("../modules/webhooks/webhook-event.model");

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
    // "accepted", not "sent": an HTTP 200 from the (mock) provider only means the
    // send request was accepted — see communication.model.ts and
    // confirmation.service.ts. It's upgraded to "sent"/"delivered"/"read" only by
    // a real Meta status webhook, which this test never simulates.
    expect(sent.status).toBe("accepted");
  });

  it("persists the real Shopify order id end-to-end for a second order on the same merchant (2026-09-23 production incident regression)", async () => {
    // Reproduces the exact production scenario: a merchant's SECOND order ever
    // (first order id 111111, second order id 7613447438529, the real id from
    // the incident report) must both succeed with their real externalOrderId —
    // this is only exercisable once the orphaned merchantId_1_shopifyOrderId_1
    // index is dropped in the target database; against this schema alone it
    // already passes, proving the application layer was never the problem.
    const store = await createStore();

    const firstRes = await postWebhook(app, orderPayload(111111), {
      domain: store.domain,
      topic: "orders/create",
      webhookId: "wh-incident-1",
    });
    expect(firstRes.status).toBe(200);

    const secondRes = await postWebhook(app, orderPayload("7613447438529"), {
      domain: store.domain,
      topic: "orders/create",
      webhookId: "wh-incident-2",
    });
    expect(secondRes.status).toBe(200);
    expect(secondRes.body.data.created).toBe(true);

    const order = await OrderModel.findOne({
      storeId: store._id,
      externalOrderId: "7613447438529",
    });
    expect(order).not.toBeNull();
    expect(order.externalOrderId).toBe("7613447438529");

    const orderCountForMerchant = await OrderModel.countDocuments({ merchantId: store.merchantId });
    expect(orderCountForMerchant).toBe(2);
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

  it("does not permanently blackhole an order when ingestion fails: a retry with the same webhook id is reprocessed", async () => {
    const store = await createStore();
    const headers = { domain: store.domain, topic: "orders/create", webhookId: "wh-5006" };

    const createSpy = jest
      .spyOn(OrderModel, "create")
      .mockImplementationOnce(() => Promise.reject(new Error("Simulated transient DB failure")));

    const failedAttempt = await postWebhook(app, orderPayload(5006), headers);
    expect(failedAttempt.status).toBe(500);

    const eventAfterFailure = await WebhookEventModel.findOne({
      source: "shopify",
      idempotencyKey: "wh-5006",
    });
    expect(eventAfterFailure.status).toBe("failed");
    expect(await OrderModel.countDocuments({ storeId: store._id, externalOrderId: "5006" })).toBe(0);

    createSpy.mockRestore();

    const retry = await postWebhook(app, orderPayload(5006), headers);
    expect(retry.status).toBe(200);
    expect(retry.body.data.created).toBe(true);

    const order = await OrderModel.findOne({ storeId: store._id, externalOrderId: "5006" });
    expect(order).not.toBeNull();

    const eventAfterRetry = await WebhookEventModel.findOne({
      source: "shopify",
      idempotencyKey: "wh-5006",
    });
    expect(eventAfterRetry.status).toBe("completed");

    const sentCount = await CommunicationModel.countDocuments({
      orderId: order._id,
      channel: "whatsapp",
      type: "confirmation_sent",
    });
    expect(sentCount).toBe(1);
  });

  it("rejects a payload with no Shopify order id without creating an order, and leaves the event retryable", async () => {
    const store = await createStore();
    const headers = { domain: store.domain, topic: "orders/create", webhookId: "wh-5007" };
    const payload = orderPayload(5007);
    delete (payload as { id?: unknown }).id;

    const res = await postWebhook(app, payload, headers);
    expect(res.status).toBe(500);

    const order = await OrderModel.findOne({ storeId: store._id });
    expect(order).toBeNull();

    const event = await WebhookEventModel.findOne({ source: "shopify", idempotencyKey: "wh-5007" });
    expect(event.status).toBe("failed");

    const sent = await CommunicationModel.countDocuments({ channel: "whatsapp", type: "confirmation_sent" });
    expect(sent).toBe(0);
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
