import crypto from "node:crypto";
import request from "supertest";
import { createApp } from "../src/app";
import { Merchant } from "../src/models/merchant.model";
import { Order } from "../src/models/order.model";
import { WebhookEvent } from "../src/models/webhook-event.model";
import { clearTestDB, connectTestDB, disconnectTestDB } from "./helpers/db";

const app = createApp();
const SHOP_DOMAIN = "test-shop.myshopify.com";

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

function computeHmac(rawBody: string): string {
  // Matches vitest.config.mts's fixed SHOPIFY_API_SECRET test value.
  return crypto.createHmac("sha256", "test-shopify-api-secret").update(rawBody).digest("base64");
}

async function seedConnectedMerchant() {
  return Merchant.create({
    name: "Test Store",
    email: "owner@example.com",
    passwordHash: "not-a-real-hash",
    shopify: { shopDomain: SHOP_DOMAIN, connectedAt: new Date() },
  });
}

const orderPayload = {
  id: 555000111,
  order_number: 1042,
  currency: "EGP",
  subtotal_price: "250.00",
  total_discounts: "0.00",
  total_price: "300.00",
  customer: { first_name: "Ahmed", last_name: "Hassan", phone: "+201234567890", email: "ahmed@example.com" },
  shipping_lines: [{ price: "50.00" }],
  line_items: [{ title: "T-Shirt", quantity: 1, price: "250.00" }],
};

describe("POST /api/v1/webhooks/shopify/orders/create", () => {
  it("rejects a request with an invalid HMAC signature", async () => {
    await seedConnectedMerchant();
    const raw = JSON.stringify(orderPayload);

    const response = await request(app)
      .post("/api/v1/webhooks/shopify/orders/create")
      .set("Content-Type", "application/json")
      .set("X-Shopify-Hmac-Sha256", "not-a-valid-signature")
      .set("X-Shopify-Shop-Domain", SHOP_DOMAIN)
      .send(raw);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_WEBHOOK_SIGNATURE");
  });

  it("creates exactly one order even when the same webhook is delivered twice", async () => {
    await seedConnectedMerchant();
    const raw = JSON.stringify(orderPayload);
    const hmac = computeHmac(raw);

    const deliver = () =>
      request(app)
        .post("/api/v1/webhooks/shopify/orders/create")
        .set("Content-Type", "application/json")
        .set("X-Shopify-Hmac-Sha256", hmac)
        .set("X-Shopify-Shop-Domain", SHOP_DOMAIN)
        .set("X-Shopify-Webhook-Id", "webhook-abc-123")
        .send(raw);

    const first = await deliver();
    const second = await deliver();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.data.duplicate).toBe(true);

    const orders = await Order.find({ shopifyOrderId: String(orderPayload.id) });
    expect(orders).toHaveLength(1);

    const events = await WebhookEvent.find({ externalEventId: "webhook-abc-123" });
    expect(events).toHaveLength(1);
    expect(events[0]?.status).toBe("PROCESSED");
  });

  it("acknowledges but does not create an order for an unrecognized shop", async () => {
    const raw = JSON.stringify(orderPayload);
    const hmac = computeHmac(raw);

    const response = await request(app)
      .post("/api/v1/webhooks/shopify/orders/create")
      .set("Content-Type", "application/json")
      .set("X-Shopify-Hmac-Sha256", hmac)
      .set("X-Shopify-Shop-Domain", "unknown-shop.myshopify.com")
      .send(raw);

    expect(response.status).toBe(200);
    const orders = await Order.find({ shopifyOrderId: String(orderPayload.id) });
    expect(orders).toHaveLength(0);
  });
});
