import request from "supertest";
import { createApp } from "../src/app";

describe("GET /api/v1/health", () => {
  it("returns a successful health payload", async () => {
    const app = createApp();
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
    expect(["connected", "connecting", "disconnected", "disconnecting"]).toContain(
      response.body.data.database,
    );
  });
});

describe("unknown route", () => {
  it("returns a 404 with the standard error envelope", async () => {
    const app = createApp();
    const response = await request(app).get("/api/v1/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
