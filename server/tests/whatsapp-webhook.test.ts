import request from "supertest";
import { createApp } from "../src/app";

const app = createApp();

describe("GET /api/v1/webhooks/whatsapp", () => {
  it("echoes the challenge when the verify token matches", async () => {
    // Matches vitest.config.mts's fixed WHATSAPP_VERIFY_TOKEN test value.
    const response = await request(app).get("/api/v1/webhooks/whatsapp").query({
      "hub.mode": "subscribe",
      "hub.verify_token": "test-verify-token",
      "hub.challenge": "challenge-123",
    });

    expect(response.status).toBe(200);
    expect(response.text).toBe("challenge-123");
  });

  it("rejects when the verify token does not match", async () => {
    const response = await request(app).get("/api/v1/webhooks/whatsapp").query({
      "hub.mode": "subscribe",
      "hub.verify_token": "wrong-token",
      "hub.challenge": "challenge-123",
    });

    expect(response.status).toBe(403);
  });
});

describe("POST /api/v1/webhooks/whatsapp", () => {
  it("rejects a request with a missing/invalid signature", async () => {
    const response = await request(app)
      .post("/api/v1/webhooks/whatsapp")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ entry: [] }));

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_WEBHOOK_SIGNATURE");
  });
});
