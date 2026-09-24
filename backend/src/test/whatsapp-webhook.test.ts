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
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { sendConfirmationForOrder } = require("../modules/confirmations/confirmation.service");

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

  async function seedOutboundConfirmation(order: any, providerMessageId: string) {
    await CommunicationModel.create({
      merchantId: order.merchantId,
      orderId: order._id,
      channel: "whatsapp",
      direction: "outbound",
      type: "confirmation_sent",
      status: "accepted",
      providerMessageId,
    });
  }

  function buttonReplyBody(opts: { messageId: string; buttonId: string; title: string; contextId: string; from?: string }) {
    return JSON.stringify(
      metaEnvelope({
        messages: [
          {
            id: opts.messageId,
            from: opts.from ?? "201001234567",
            type: "interactive",
            interactive: { button_reply: { id: opts.buttonId, title: opts.title } },
            context: { id: opts.contextId },
          },
        ],
      })
    );
  }

  it("confirms an order on a confirm_order button reply, correlated via context.id (the replied-to template's wamid), and records the inbound event", async () => {
    const { order } = await createOrderFixture();
    await seedOutboundConfirmation(order, "wamid.TEMPLATE1");

    const body = buttonReplyBody({
      messageId: "wamid.BTN1",
      buttonId: "confirm_order",
      title: "تأكيد الطلب",
      contextId: "wamid.TEMPLATE1",
    });

    const res = await postWebhook(app, body, sign(body));
    expect(res.status).toBe(200);

    const updated = await OrderModel.findById(order.id);
    expect(updated.confirmationStatus).toBe("confirmed");

    const events = await CommunicationModel.find({ orderId: order.id, direction: "inbound" });
    expect(events).toHaveLength(1);
    expect(events[0].status).toBe("confirmed");
  });

  it("does not confirm/cancel anything when the button reply's context.id doesn't match any known outbound message", async () => {
    const { order } = await createOrderFixture();
    const body = buttonReplyBody({
      messageId: "wamid.BTN_ORPHAN",
      buttonId: "confirm_order",
      title: "تأكيد الطلب",
      contextId: "wamid.NEVER_SENT",
    });

    const res = await postWebhook(app, body, sign(body));
    expect(res.status).toBe(200);

    const updated = await OrderModel.findById(order.id);
    expect(updated.confirmationStatus).toBe("pending");
    expect(await CommunicationModel.countDocuments({ orderId: order.id, direction: "inbound" })).toBe(0);
  });

  it("cannot act on another merchant's order — context.id only ever resolves to the order it was actually sent for", async () => {
    const { order: orderA } = await createOrderFixture();
    const { order: orderB } = await createOrderFixture();
    await seedOutboundConfirmation(orderA, "wamid.TEMPLATE_A");
    await seedOutboundConfirmation(orderB, "wamid.TEMPLATE_B");

    const body = buttonReplyBody({
      messageId: "wamid.BTN_A",
      buttonId: "confirm_order",
      title: "تأكيد الطلب",
      contextId: "wamid.TEMPLATE_A",
    });
    await postWebhook(app, body, sign(body));

    expect((await OrderModel.findById(orderA.id)).confirmationStatus).toBe("confirmed");
    expect((await OrderModel.findById(orderB.id)).confirmationStatus).toBe("pending");
  });

  it("safely ignores an unknown button id instead of crashing", async () => {
    const { order } = await createOrderFixture();
    await seedOutboundConfirmation(order, "wamid.TEMPLATE_UNKNOWN");

    const body = buttonReplyBody({
      messageId: "wamid.BTN_UNKNOWN",
      buttonId: "some_other_button",
      title: "???",
      contextId: "wamid.TEMPLATE_UNKNOWN",
    });

    const res = await postWebhook(app, body, sign(body));
    expect(res.status).toBe(200);
    expect((await OrderModel.findById(order.id)).confirmationStatus).toBe("pending");
  });

  it("processes a duplicate button-tap webhook delivery idempotently (no double confirmation)", async () => {
    const { order } = await createOrderFixture();
    await seedOutboundConfirmation(order, "wamid.TEMPLATE_DUP");

    const body = buttonReplyBody({
      messageId: "wamid.BTN_DUP",
      buttonId: "confirm_order",
      title: "تأكيد الطلب",
      contextId: "wamid.TEMPLATE_DUP",
    });

    await postWebhook(app, body, sign(body));
    await postWebhook(app, body, sign(body));

    expect((await OrderModel.findById(order.id)).confirmationStatus).toBe("confirmed");
    expect(await CommunicationModel.countDocuments({ orderId: order.id, direction: "inbound" })).toBe(1);
  });

  it("cancel_order does not cancel immediately — it asks for a reason, then cancels once the reason arrives, and never sends the prompt twice", async () => {
    const { order } = await createOrderFixture();
    await seedOutboundConfirmation(order, "wamid.TEMPLATE_CANCEL");

    const cancelBody = buttonReplyBody({
      messageId: "wamid.BTN_CANCEL",
      buttonId: "cancel_order",
      title: "إلغاء الطلب",
      contextId: "wamid.TEMPLATE_CANCEL",
    });
    const res1 = await postWebhook(app, cancelBody, sign(cancelBody));
    expect(res1.status).toBe(200);

    let updated = await OrderModel.findById(order.id);
    expect(updated.confirmationStatus).toBe("awaiting_cancellation_reason");
    const promptEvents = await CommunicationModel.find({ orderId: order.id, type: "cancellation_reason_requested" });
    expect(promptEvents).toHaveLength(1);

    // A second, genuinely different cancel-button webhook delivery for the
    // same order (e.g. an impatient double-tap) must not send the prompt again.
    const secondCancelBody = buttonReplyBody({
      messageId: "wamid.BTN_CANCEL_2",
      buttonId: "cancel_order",
      title: "إلغاء الطلب",
      contextId: "wamid.TEMPLATE_CANCEL",
    });
    await postWebhook(app, secondCancelBody, sign(secondCancelBody));
    expect(await CommunicationModel.countDocuments({ orderId: order.id, type: "cancellation_reason_requested" })).toBe(1);

    const reasonBody = JSON.stringify(
      metaEnvelope({
        messages: [{ id: "wamid.REASON1", from: "201001234567", type: "text", text: { body: "Changed my mind" } }],
      })
    );
    const res2 = await postWebhook(app, reasonBody, sign(reasonBody));
    expect(res2.status).toBe(200);

    updated = await OrderModel.findById(order.id);
    expect(updated.confirmationStatus).toBe("cancelled");
    expect(updated.cancellationReason).toBe("Changed my mind");

    const finalCancelEvent = await CommunicationModel.findOne({
      orderId: order.id,
      direction: "inbound",
      status: "cancelled",
    });
    expect(finalCancelEvent).not.toBeNull();
    expect(finalCancelEvent.metadata.reason).toBe("Changed my mind");
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

  it("sends the approved akedly_order_confirmation template (not a freeform/interactive message) via the Graph API messages endpoint", async () => {
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
      language: "ar",
      customerName: "Ahmed",
      storeName: "Leopard",
      orderNumber: "1042",
      items: [{ name: "Shirt", quantity: 1 }],
      total: 500,
      currency: "EGP",
    });

    expect(result.success).toBe(true);
    expect(result.providerMessageId).toBe("wamid.OUT1");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://graph.facebook.com/v20.0/1234567890/messages");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer test-access-token");

    const bodySent = JSON.parse(calls[0].init.body as string);
    expect(bodySent.to).toBe("+201001234567");
    // Not "interactive" — a freeform/interactive message here would return
    // HTTP 200 with a wamid and then fail asynchronously outside an open 24h
    // session (see whatsapp-meta.provider.ts's sendOrderConfirmation doc).
    expect(bodySent.type).toBe("template");
    expect(bodySent.template.name).toBe("akedly_order_confirmation");
    // Exactly "en" — never a locale variant, and never derived from
    // input.language ("ar" was passed above but must not leak through).
    expect(bodySent.template.language.code).toBe("en");
    expect(bodySent.template.language.code).not.toBe("en_US");
    expect(bodySent.template.language.code).not.toBe("en_GB");
    expect(bodySent.template.language.code).not.toBe("ar");
    expect(bodySent.template.language.code).not.toBe("ar_EG");

    const params = bodySent.template.components[0].parameters;
    expect(params).toEqual([
      { type: "text", parameter_name: "customer_name", text: "Ahmed" },
      { type: "text", parameter_name: "order_id", text: "#1042" },
      { type: "text", parameter_name: "store_name", text: "Leopard" },
      // Formatted in the template's fixed "en" language regardless of the
      // store's own messageLanguage ("ar" was passed above) — see the
      // provider's doc comment.
      { type: "text", parameter_name: "order_total", text: "500 EGP" },
    ]);
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

  it("2026-09-25 production incident: a Meta 132001 ('Template name does not exist in the translation') response is recorded as a provider failure, not a false success", async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 404,
      json: async () => ({
        error: {
          message: "(#132001) Template name does not exist in the translation",
          type: "OAuthException",
          code: 132001,
        },
      }),
    })) as unknown as typeof fetch;

    const provider = new WhatsAppMetaProvider();
    const result = await provider.sendOrderConfirmation({
      orderId: "order1",
      toPhone: "+201001234567",
      language: "ar",
      customerName: "Ahmed",
      storeName: "Leopard",
      orderNumber: "1042",
      items: [],
      total: 100,
      currency: "EGP",
    });

    expect(result.success).toBe(false);
    expect(result.errorDetails).toMatchObject({ httpStatus: 404, code: 132001 });
    expect(result.providerMessageId).toBeUndefined();
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
