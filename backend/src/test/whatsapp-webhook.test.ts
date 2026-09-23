import crypto from "crypto";
import request from "supertest";

// IMPORTANT: process.env must be set before anything that transitively imports
// config/env.ts is required — ES `import` statements are hoisted above plain
// statements, so any local-module `import` here would load env.ts (and its real
// .env file) too early. Local modules are pulled in via require() below instead.
process.env.WHATSAPP_META_APP_SECRET = "test-whatsapp-app-secret";
process.env.WHATSAPP_META_VERIFY_TOKEN = "test-verify-token";
process.env.WHATSAPP_META_ACCESS_TOKEN = "test-access-token";
process.env.WHATSAPP_META_PHONE_NUMBER_ID = "1234567890";
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
const { WhatsAppMetaProvider } = require("../integrations/confirmation-providers/whatsapp-meta.provider");

function sign(rawBody: string): string {
  return "sha256=" + crypto.createHmac("sha256", "test-whatsapp-app-secret").update(rawBody).digest("hex");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function postWebhook(app: any, rawBody: string, signature?: string) {
  const req = request(app).post("/api/v1/webhooks/whatsapp").set("Content-Type", "application/json");
  if (signature !== undefined) req.set("x-hub-signature-256", signature);
  return req.send(rawBody);
}

async function createOrderFixture() {
  const merchant = await MerchantModel.create({
    name: "Test Merchant",
    email: `merchant_${Date.now()}_${Math.random()}@example.com`,
    passwordHash: "hash",
  });
  const store = await StoreModel.create({
    merchantId: merchant._id,
    platform: "shopify",
    name: "Leopard",
    domain: "leopard.myshopify.com",
    status: "connected",
  });
  const order = await OrderModel.create({
    merchantId: merchant._id,
    storeId: store._id,
    externalOrderId: "1",
    orderNumber: "1",
    customer: { name: "Ahmed Ali", phone: "+201001234567" },
    items: [{ name: "Item", quantity: 1, price: 100 }],
    subtotal: 100,
    shipping: 0,
    total: 100,
    currency: "EGP",
    platform: "shopify",
    confirmationStatus: "pending",
  });
  return { merchant, store, order };
}

describe("GET /api/v1/webhooks/whatsapp (Meta verification handshake)", () => {
  const app = createApp();

  it("returns the raw challenge with 200 for the correct verify token", async () => {
    const res = await request(app)
      .get("/api/v1/webhooks/whatsapp")
      .query({ "hub.mode": "subscribe", "hub.verify_token": "test-verify-token", "hub.challenge": "challenge-123" });

    expect(res.status).toBe(200);
    expect(res.text).toBe("challenge-123");
  });

  it("returns 403 for an incorrect verify token", async () => {
    const res = await request(app)
      .get("/api/v1/webhooks/whatsapp")
      .query({ "hub.mode": "subscribe", "hub.verify_token": "wrong-token", "hub.challenge": "challenge-123" });

    expect(res.status).toBe(403);
  });
});

describe("POST /api/v1/webhooks/whatsapp signature verification", () => {
  const app = createApp();

  it("accepts a request with a valid signature", async () => {
    const body = JSON.stringify({ entry: [] });
    const res = await postWebhook(app, body, sign(body));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("rejects a request with an invalid signature (401)", async () => {
    const body = JSON.stringify({ entry: [] });
    const res = await postWebhook(app, body, "sha256=deadbeef");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_SIGNATURE");
  });

  it("rejects a request with no signature header (401)", async () => {
    const body = JSON.stringify({ entry: [] });
    const res = await postWebhook(app, body);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_SIGNATURE");
  });

  it("rejects malformed (non-JSON) payloads even with a valid signature (400)", async () => {
    const body = "not valid json{";
    const res = await postWebhook(app, body, sign(body));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("MALFORMED_PAYLOAD");
  });
});

describe("POST /api/v1/webhooks/whatsapp event handling", () => {
  const app = createApp();

  function metaEnvelope(value: Record<string, unknown>) {
    return { entry: [{ changes: [{ field: "messages", value }] }] };
  }

  it("accepts an incoming text message without error", async () => {
    const body = JSON.stringify(
      metaEnvelope({
        messages: [{ id: "wamid.TEXT1", from: "201001234567", type: "text", text: { body: "hi" } }],
      })
    );
    const res = await postWebhook(app, body, sign(body));
    expect(res.status).toBe(200);
    expect(res.body.data.messages).toBe(1);
  });

  it("safely acknowledges an unknown/unrelated event without crashing", async () => {
    const body = JSON.stringify({
      entry: [{ changes: [{ field: "message_template_status_update", value: { unexpected: true } }] }],
    });
    const res = await postWebhook(app, body, sign(body));
    expect(res.status).toBe(200);
    expect(res.body.data.messages).toBe(0);
    expect(res.body.data.statuses).toBe(0);
  });

  it("confirms an order on a confirm button reply and records the inbound event", async () => {
    const { order } = await createOrderFixture();
    const body = JSON.stringify(
      metaEnvelope({
        messages: [
          {
            id: "wamid.BTN1",
            from: "201001234567",
            type: "interactive",
            interactive: { button_reply: { id: `confirm:${order.id}`, title: "Confirm Order" } },
          },
        ],
      })
    );

    const res = await postWebhook(app, body, sign(body));
    expect(res.status).toBe(200);

    const updated = await OrderModel.findById(order.id);
    expect(updated.confirmationStatus).toBe("confirmed");

    const events = await CommunicationModel.find({ orderId: order.id, direction: "inbound" });
    expect(events).toHaveLength(1);
    expect(events[0].status).toBe("confirmed");
  });

  it("updates the matching outbound communication's status from a status webhook", async () => {
    const { merchant, order } = await createOrderFixture();
    await CommunicationModel.create({
      merchantId: merchant._id,
      orderId: order._id,
      channel: "whatsapp",
      direction: "outbound",
      type: "confirmation_sent",
      status: "sent",
      providerMessageId: "wamid.SENT1",
    });

    const body = JSON.stringify(
      metaEnvelope({
        statuses: [{ id: "wamid.SENT1", status: "delivered", recipient_id: "201001234567" }],
      })
    );
    const res = await postWebhook(app, body, sign(body));
    expect(res.status).toBe(200);

    const comm = await CommunicationModel.findOne({ providerMessageId: "wamid.SENT1" });
    expect(comm.status).toBe("delivered");
  });

  it("upgrades a freshly-accepted send (HTTP 200 from Meta, not yet delivered) through a real status webhook — 2026-09-23/24 production report regression", async () => {
    // Reproduces the reported scenario exactly: confirmation.service.ts records
    // "accepted" immediately after Meta's Graph API returns 200 (not "sent" —
    // that's not delivery confirmation). Only a genuine Meta status webhook
    // should ever move it further, and this proves the matching/update logic
    // does that correctly for the accepted -> sent -> delivered path.
    const { merchant, order } = await createOrderFixture();
    await CommunicationModel.create({
      merchantId: merchant._id,
      orderId: order._id,
      channel: "whatsapp",
      direction: "outbound",
      type: "confirmation_sent",
      status: "accepted",
      providerMessageId: "wamid.ACCEPTED1",
    });

    const sentBody = JSON.stringify(
      metaEnvelope({ statuses: [{ id: "wamid.ACCEPTED1", status: "sent", recipient_id: "201001234567" }] })
    );
    expect((await postWebhook(app, sentBody, sign(sentBody))).status).toBe(200);
    expect((await CommunicationModel.findOne({ providerMessageId: "wamid.ACCEPTED1" })).status).toBe("sent");

    const deliveredBody = JSON.stringify(
      metaEnvelope({ statuses: [{ id: "wamid.ACCEPTED1", status: "delivered", recipient_id: "201001234567" }] })
    );
    expect((await postWebhook(app, deliveredBody, sign(deliveredBody))).status).toBe(200);
    expect((await CommunicationModel.findOne({ providerMessageId: "wamid.ACCEPTED1" })).status).toBe("delivered");
  });

  it("records a failed status with safe error metadata (no secrets)", async () => {
    const { merchant, order } = await createOrderFixture();
    await CommunicationModel.create({
      merchantId: merchant._id,
      orderId: order._id,
      channel: "whatsapp",
      direction: "outbound",
      type: "confirmation_sent",
      status: "sent",
      providerMessageId: "wamid.SENT2",
    });

    const body = JSON.stringify(
      metaEnvelope({
        statuses: [
          {
            id: "wamid.SENT2",
            status: "failed",
            recipient_id: "201001234567",
            errors: [{ code: 131026, title: "Message undeliverable" }],
          },
        ],
      })
    );
    const res = await postWebhook(app, body, sign(body));
    expect(res.status).toBe(200);

    const comm = await CommunicationModel.findOne({ providerMessageId: "wamid.SENT2" });
    expect(comm.status).toBe("failed");
    expect(comm.metadata.errors[0].code).toBe(131026);
  });

  it("does not error when a status update references an unknown message id", async () => {
    const body = JSON.stringify(
      metaEnvelope({ statuses: [{ id: "wamid.UNKNOWN", status: "read" }] })
    );
    const res = await postWebhook(app, body, sign(body));
    expect(res.status).toBe(200);
  });

  it("processes a duplicate status delivery idempotently (no duplicate side effects)", async () => {
    const { merchant, order } = await createOrderFixture();
    await CommunicationModel.create({
      merchantId: merchant._id,
      orderId: order._id,
      channel: "whatsapp",
      direction: "outbound",
      type: "confirmation_sent",
      status: "sent",
      providerMessageId: "wamid.DUP1",
    });

    const body = JSON.stringify(
      metaEnvelope({ statuses: [{ id: "wamid.DUP1", status: "read" }] })
    );
    const first = await postWebhook(app, body, sign(body));
    const second = await postWebhook(app, body, sign(body));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const comm = await CommunicationModel.findOne({ providerMessageId: "wamid.DUP1" });
    expect(comm.status).toBe("read");
  });
});

describe("WHATSAPP_META_APP_SECRET not configured", () => {
  it("rejects webhook requests instead of silently skipping verification", async () => {
    const previous = process.env.WHATSAPP_META_APP_SECRET;
    delete process.env.WHATSAPP_META_APP_SECRET;
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createApp: createAppNoSecret } = require("../app");
    const appNoSecret = createAppNoSecret();

    const body = JSON.stringify({ entry: [] });
    const res = await request(appNoSecret)
      .post("/api/v1/webhooks/whatsapp")
      .set("Content-Type", "application/json")
      .send(body);

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("WEBHOOK_NOT_CONFIGURED");

    process.env.WHATSAPP_META_APP_SECRET = previous;
    jest.resetModules();
  });
});

describe("WHATSAPP_META_VERIFY_TOKEN whitespace handling", () => {
  it("still matches when the configured token has accidental leading/trailing whitespace", async () => {
    const previous = process.env.WHATSAPP_META_VERIFY_TOKEN;
    process.env.WHATSAPP_META_VERIFY_TOKEN = "  test-verify-token\n";
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createApp: createAppPadded } = require("../app");
    const appPadded = createAppPadded();

    const res = await request(appPadded)
      .get("/api/v1/webhooks/whatsapp")
      .query({ "hub.mode": "subscribe", "hub.verify_token": "test-verify-token", "hub.challenge": "chal" });

    expect(res.status).toBe(200);
    expect(res.text).toBe("chal");

    process.env.WHATSAPP_META_VERIFY_TOKEN = previous;
    jest.resetModules();
  });
});

describe("WhatsAppMetaProvider", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("sends an order confirmation via the Graph API messages endpoint", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    global.fetch = jest.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return {
        ok: true,
        status: 200,
        json: async () => ({ messages: [{ id: "wamid.OUT1" }] }),
      } as Response;
    }) as typeof fetch;

    const provider = new WhatsAppMetaProvider();
    const result = await provider.sendOrderConfirmation({
      orderId: "order1",
      toPhone: "+201001234567",
      language: "en",
      customerName: "Ahmed",
      storeName: "Leopard",
      orderNumber: "1042",
      items: [{ name: "Shirt", quantity: 1 }],
      total: 100,
      currency: "EGP",
    });

    expect(result.success).toBe(true);
    expect(result.providerMessageId).toBe("wamid.OUT1");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://graph.facebook.com/v20.0/1234567890/messages");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer test-access-token");
    const bodySent = JSON.parse(calls[0].init.body as string);
    expect(bodySent.to).toBe("+201001234567");
    expect(bodySent.type).toBe("interactive");
  });

  it("sends a template message (e.g. hello_world) via the same endpoint", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ messages: [{ id: "wamid.TPL1" }] }),
    })) as unknown as typeof fetch;

    const provider = new WhatsAppMetaProvider();
    const result = await provider.sendTemplateMessage({
      toPhone: "+201001234567",
      templateName: "hello_world",
      languageCode: "en_US",
    });

    expect(result.success).toBe(true);
    expect(result.providerMessageId).toBe("wamid.TPL1");
  });

  it("normalizes a Meta API error without leaking the access token", async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({
        error: { message: "Invalid OAuth access token", type: "OAuthException", code: 190 },
      }),
    })) as unknown as typeof fetch;

    const provider = new WhatsAppMetaProvider();
    const result = await provider.sendOrderConfirmation({
      orderId: "order1",
      toPhone: "+201001234567",
      language: "en",
      customerName: "Ahmed",
      storeName: "Leopard",
      orderNumber: "1042",
      items: [{ name: "Shirt", quantity: 1 }],
      total: 100,
      currency: "EGP",
    });

    expect(result.success).toBe(false);
    expect(result.errorDetails).toMatchObject({ httpStatus: 401, code: 190, type: "OAuthException" });
    expect(result.error).not.toContain("test-access-token");
    expect(JSON.stringify(result)).not.toContain("test-access-token");
  });

  it("returns a safe failure when credentials aren't configured", async () => {
    const previousToken = process.env.WHATSAPP_META_ACCESS_TOKEN;
    delete process.env.WHATSAPP_META_ACCESS_TOKEN;
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { WhatsAppMetaProvider: Provider } = require("../integrations/confirmation-providers/whatsapp-meta.provider");
    const provider = new Provider();

    const result = await provider.sendOrderConfirmation({
      orderId: "order1",
      toPhone: "+201001234567",
      language: "en",
      customerName: "Ahmed",
      storeName: "Leopard",
      orderNumber: "1042",
      items: [],
      total: 0,
      currency: "EGP",
    });

    expect(result.success).toBe(false);
    process.env.WHATSAPP_META_ACCESS_TOKEN = previousToken;
    jest.resetModules();
  });
});
