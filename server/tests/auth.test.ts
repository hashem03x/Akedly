import request from "supertest";
import { createApp } from "../src/app";
import { AUTH_COOKIE_NAME } from "../src/utils/cookies";
import { clearTestDB, connectTestDB, disconnectTestDB } from "./helpers/db";
import { extractCookie } from "./helpers/cookies";

const app = createApp();

const credentials = {
  name: "Ahmed Hassan",
  email: "Ahmed@Example.com",
  password: "correct-horse-battery",
};

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe("POST /api/v1/auth/register", () => {
  it("registers a new merchant and sets the auth cookie", async () => {
    const response = await request(app).post("/api/v1/auth/register").send(credentials);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.merchant).toMatchObject({
      name: credentials.name,
      email: "ahmed@example.com", // normalized
    });
    expect(response.body.data.merchant.passwordHash).toBeUndefined();
    expect(extractCookie(response, AUTH_COOKIE_NAME)).toMatch(new RegExp(`^${AUTH_COOKIE_NAME}=.+`));
  });

  it("rejects a duplicate email", async () => {
    await request(app).post("/api/v1/auth/register").send(credentials);

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...credentials, email: "AHMED@example.com" }); // same email, different case

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
  });

  it("rejects invalid input", async () => {
    const shortPassword = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "A", email: "not-an-email", password: "short" });

    expect(shortPassword.status).toBe(400);
    expect(shortPassword.body.success).toBe(false);
    expect(shortPassword.body.error.code).toBe("VALIDATION_ERROR");

    const missingFields = await request(app).post("/api/v1/auth/register").send({});
    expect(missingFields.status).toBe(400);
    expect(missingFields.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/v1/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/v1/auth/register").send(credentials);
  });

  it("logs in with correct credentials", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: credentials.email, password: credentials.password });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.merchant.email).toBe("ahmed@example.com");
    expect(extractCookie(response, AUTH_COOKIE_NAME)).toMatch(new RegExp(`^${AUTH_COOKIE_NAME}=.+`));
  });

  it("rejects an incorrect password", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: credentials.email, password: "totally-wrong" });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects a non-existent account with the same error as a wrong password", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nobody@example.com", password: "whatever123" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
  });
});

describe("GET /api/v1/auth/me", () => {
  it("returns the authenticated merchant", async () => {
    const registerResponse = await request(app).post("/api/v1/auth/register").send(credentials);
    const cookie = extractCookie(registerResponse, AUTH_COOKIE_NAME);

    const response = await request(app).get("/api/v1/auth/me").set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.data.merchant.email).toBe("ahmed@example.com");
  });

  it("rejects a request with no session cookie", async () => {
    const response = await request(app).get("/api/v1/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects a tampered/invalid token", async () => {
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", `${AUTH_COOKIE_NAME}=not-a-real-jwt`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("clears the auth cookie", async () => {
    const response = await request(app).post("/api/v1/auth/logout");

    expect(response.status).toBe(200);
    expect(response.body.data.loggedOut).toBe(true);

    const cleared = extractCookie(response, AUTH_COOKIE_NAME);
    expect(cleared).toBe(`${AUTH_COOKIE_NAME}=`);
  });
});

describe("GET /api/v1/protected-test (authGuard reuse)", () => {
  it("returns the merchantId for an authenticated request", async () => {
    const registerResponse = await request(app).post("/api/v1/auth/register").send(credentials);
    const cookie = extractCookie(registerResponse, AUTH_COOKIE_NAME);
    const merchantId = registerResponse.body.data.merchant.id;

    const response = await request(app).get("/api/v1/protected-test").set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.data.merchantId).toBe(merchantId);
  });

  it("rejects an unauthenticated request", async () => {
    const response = await request(app).get("/api/v1/protected-test");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });
});
