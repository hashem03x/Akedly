import crypto from "crypto";
import request from "supertest";

process.env.SHOPIFY_CLIENT_SECRET = "test-shopify-secret";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createApp } = require("../app");

describe("Shopify webhook signature verification", () => {
  const app = createApp();
  const payload = JSON.stringify({ id: 1, name: "#1", line_items: [], currency: "EGP" });

  it("rejects a request with an invalid HMAC signature", async () => {
    const res = await request(app)
      .post("/api/v1/webhooks/shopify")
      .set("Content-Type", "application/json")
      .set("x-shopify-shop-domain", "leopard.myshopify.com")
      .set("x-shopify-hmac-sha256", "not-a-real-signature")
      .send(payload);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_SIGNATURE");
  });

  it("rejects a request with no shop domain header", async () => {
    const signature = crypto
      .createHmac("sha256", "test-shopify-secret")
      .update(Buffer.from(payload))
      .digest("base64");

    const res = await request(app)
      .post("/api/v1/webhooks/shopify")
      .set("Content-Type", "application/json")
      .set("x-shopify-hmac-sha256", signature)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("MISSING_SHOP_DOMAIN");
  });

  it("rejects a valid signature for a store that isn't registered", async () => {
    const signature = crypto
      .createHmac("sha256", "test-shopify-secret")
      .update(Buffer.from(payload))
      .digest("base64");

    const res = await request(app)
      .post("/api/v1/webhooks/shopify")
      .set("Content-Type", "application/json")
      .set("x-shopify-shop-domain", "unknown-store.myshopify.com")
      .set("x-shopify-hmac-sha256", signature)
      .send(payload);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("STORE_NOT_FOUND");
  });
});
