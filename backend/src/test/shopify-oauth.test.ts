import crypto from "crypto";
import request from "supertest";

// IMPORTANT: process.env must be set before anything that transitively imports
// config/env.ts is required — ES `import` statements are hoisted above plain
// statements, so any local-module `import` here would load env.ts (and its real
// .env file) too early. Local modules are pulled in via require() below instead.
process.env.SHOPIFY_CLIENT_SECRET = "test-shopify-oauth-secret";
process.env.SHOPIFY_CLIENT_ID = "test-shopify-client-id";
process.env.FRONTEND_URL = "http://localhost:3000";

// The real exchange/testConnection calls hit Shopify's actual API — stub only the
// token exchange so the "reused state" test never depends on network availability,
// while keeping normalizeShopDomain/verifyShopifyOAuthHmac/buildShopifyAuthorizeUrl real.
jest.mock("../integrations/store-providers/shopify-oauth", () => ({
  ...jest.requireActual("../integrations/store-providers/shopify-oauth"),
  exchangeShopifyCodeForToken: jest.fn().mockRejectedValue(new Error("mocked: not a real Shopify code")),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { normalizeShopDomain, exchangeShopifyCodeForToken } = require("../integrations/store-providers/shopify-oauth");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createApp } = require("../app");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { MerchantModel } = require("../modules/merchants/merchant.model");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ShopifyOAuthStateModel } = require("../modules/stores/shopify-oauth-state.model");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { StoreModel } = require("../modules/stores/store.model");

describe("normalizeShopDomain", () => {
  it("accepts plain, https-prefixed, and trailing-slash myshopify domains", () => {
    expect(normalizeShopDomain("example.myshopify.com")).toBe("example.myshopify.com");
    expect(normalizeShopDomain("https://example.myshopify.com")).toBe("example.myshopify.com");
    expect(normalizeShopDomain("https://example.myshopify.com/")).toBe("example.myshopify.com");
    expect(normalizeShopDomain("EXAMPLE.MYSHOPIFY.COM")).toBe("example.myshopify.com");
  });

  it("rejects arbitrary non-Shopify hosts (SSRF guard)", () => {
    expect(normalizeShopDomain("evil.com")).toBeNull();
    expect(normalizeShopDomain("myshopify.com.evil.com")).toBeNull();
    expect(normalizeShopDomain("example.myshopify.com.evil.com")).toBeNull();
    expect(normalizeShopDomain("localhost")).toBeNull();
    expect(normalizeShopDomain("")).toBeNull();
  });
});

function signQuery(params: Record<string, string>): string {
  const message = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto.createHmac("sha256", "test-shopify-oauth-secret").update(message).digest("hex");
}

function callbackUrl(params: Record<string, string>, withHmac = true): string {
  const query: Record<string, string> = { ...params };
  if (withHmac) {
    query.hmac = signQuery(params);
  }
  const search = new URLSearchParams(query).toString();
  return `/api/v1/integrations/shopify/oauth/callback?${search}`;
}

describe("Shopify OAuth start", () => {
  const app = createApp();

  it("requires authentication", async () => {
    const res = await request(app).get(
      "/api/v1/integrations/shopify/oauth/start?shop=example.myshopify.com"
    );
    expect(res.status).toBe(401);
  });

  it("redirects an authenticated merchant to Shopify's authorize URL and records OAuth state", async () => {
    const register = await request(app).post("/api/v1/auth/register").send({
      name: "Test Merchant",
      email: `oauth_${Date.now()}@example.com`,
      password: "password123",
    });
    expect(register.status).toBe(201);
    const cookie = register.headers["set-cookie"];

    const res = await request(app)
      .get("/api/v1/integrations/shopify/oauth/start?shop=example.myshopify.com")
      .set("Cookie", cookie);

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("https://example.myshopify.com/admin/oauth/authorize");
    expect(res.headers.location).toContain("client_id=test-shopify-client-id");
    expect(res.headers.location).not.toContain("client_secret");

    const stateParam = new URL(res.headers.location).searchParams.get("state");
    const stored = await ShopifyOAuthStateModel.findOne({ state: stateParam });
    expect(stored).not.toBeNull();
    expect(stored?.shop).toBe("example.myshopify.com");
  });

  it("rejects an invalid shop domain without leaving Akedly", async () => {
    const register = await request(app).post("/api/v1/auth/register").send({
      name: "Test Merchant",
      email: `oauth_${Date.now()}_2@example.com`,
      password: "password123",
    });
    expect(register.status).toBe(201);
    const cookie = register.headers["set-cookie"];

    const res = await request(app)
      .get("/api/v1/integrations/shopify/oauth/start?shop=evil.com")
      .set("Cookie", cookie);

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("code=invalid_shop");
  });
});

describe("Shopify OAuth callback", () => {
  const app = createApp();

  it("redirects with invalid_callback when required params are missing", async () => {
    const res = await request(app).get("/api/v1/integrations/shopify/oauth/callback?shop=example.myshopify.com");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("code=invalid_callback");
  });

  it("redirects with authorization_denied when Shopify reports an error", async () => {
    const res = await request(app).get(
      "/api/v1/integrations/shopify/oauth/callback?shop=example.myshopify.com&error=access_denied"
    );
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("code=authorization_denied");
  });

  it("redirects with invalid_shop for a non-Shopify domain", async () => {
    const url = callbackUrl({ shop: "evil.com", code: "abc", state: "somestate" });
    const res = await request(app).get(url);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("code=invalid_shop");
  });

  it("redirects with invalid_signature when the HMAC doesn't match", async () => {
    const url =
      callbackUrl({ shop: "example.myshopify.com", code: "abc", state: "somestate" }, false) + "&hmac=deadbeef";
    const res = await request(app).get(url);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("code=invalid_signature");
  });

  it("redirects with invalid_state for an unknown (but correctly signed) state", async () => {
    const url = callbackUrl({ shop: "example.myshopify.com", code: "abc", state: "never-issued" });
    const res = await request(app).get(url);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("code=invalid_state");
  });

  it("redirects with state_expired for an expired state", async () => {
    const merchant = await MerchantModel.create({
      name: "Test Merchant",
      email: `merchant_${Date.now()}@example.com`,
      passwordHash: "hash",
    });
    await ShopifyOAuthStateModel.create({
      state: "expired-state",
      merchantId: merchant._id,
      shop: "example.myshopify.com",
      expiresAt: new Date(Date.now() - 1000),
    });

    const url = callbackUrl({ shop: "example.myshopify.com", code: "abc", state: "expired-state" });
    const res = await request(app).get(url);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("code=state_expired");
  });

  it("redirects with state_already_used on a replayed callback", async () => {
    const merchant = await MerchantModel.create({
      name: "Test Merchant",
      email: `merchant_${Date.now()}_2@example.com`,
      passwordHash: "hash",
    });
    await ShopifyOAuthStateModel.create({
      state: "used-state",
      merchantId: merchant._id,
      shop: "example.myshopify.com",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: new Date(),
    });

    const url = callbackUrl({ shop: "example.myshopify.com", code: "abc", state: "used-state" });
    const res = await request(app).get(url);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("code=state_already_used");
  });

  it("consumes a valid, unexpired state exactly once (second attempt is rejected as reused)", async () => {
    const merchant = await MerchantModel.create({
      name: "Test Merchant",
      email: `merchant_${Date.now()}_3@example.com`,
      passwordHash: "hash",
    });
    await ShopifyOAuthStateModel.create({
      state: "fresh-state",
      merchantId: merchant._id,
      shop: "example.myshopify.com",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const url = callbackUrl({ shop: "example.myshopify.com", code: "abc", state: "fresh-state" });

    // First attempt proceeds past state validation (it fails later at the real
    // Shopify token exchange, since "abc" isn't a real code and example.myshopify.com
    // isn't reachable — that's fine, we're only asserting the state gets consumed).
    const first = await request(app).get(url);
    expect(first.status).toBe(302);
    expect(first.headers.location).not.toContain("code=invalid_state");
    expect(first.headers.location).not.toContain("code=state_expired");
    expect(first.headers.location).not.toContain("code=state_already_used");

    const second = await request(app).get(url);
    expect(second.status).toBe(302);
    expect(second.headers.location).toContain("code=state_already_used");
  }, 20000);

  it("redirects a still-onboarding merchant's failure to /onboarding, not /dashboard/stores", async () => {
    const merchant = await MerchantModel.create({
      name: "Test Merchant",
      email: `merchant_${Date.now()}_4@example.com`,
      passwordHash: "hash",
      onboardingCompleted: false,
    });
    await ShopifyOAuthStateModel.create({
      state: "onboarding-merchant-state",
      merchantId: merchant._id,
      shop: "example.myshopify.com",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const url = callbackUrl({ shop: "example.myshopify.com", code: "abc", state: "onboarding-merchant-state" });
    const res = await request(app).get(url);

    expect(res.status).toBe(302);
    // exchangeShopifyCodeForToken is mocked to reject, so this hits oauth_exchange_failed —
    // the point being asserted is WHERE it redirects, not which specific failure code.
    expect(res.headers.location).toMatch(/^http:\/\/localhost:3000\/onboarding\?/);
  });

  it("redirects an already-onboarded merchant's failure to /dashboard/stores", async () => {
    const merchant = await MerchantModel.create({
      name: "Test Merchant",
      email: `merchant_${Date.now()}_5@example.com`,
      passwordHash: "hash",
      onboardingCompleted: true,
    });
    await ShopifyOAuthStateModel.create({
      state: "onboarded-merchant-state",
      merchantId: merchant._id,
      shop: "example.myshopify.com",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const url = callbackUrl({ shop: "example.myshopify.com", code: "abc", state: "onboarded-merchant-state" });
    const res = await request(app).get(url);

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/^http:\/\/localhost:3000\/dashboard\/stores\?/);
  });

  it("full happy path: state -> token exchange -> GraphQL testConnection -> store created -> onboarding completed -> redirected to dashboard/stores", async () => {
    const merchant = await MerchantModel.create({
      name: "Test Merchant",
      email: `merchant_${Date.now()}_6@example.com`,
      passwordHash: "hash",
      onboardingCompleted: false,
    });
    await ShopifyOAuthStateModel.create({
      state: "happy-path-state",
      merchantId: merchant._id,
      shop: "dev-akedly.myshopify.com",
      expiresAt: new Date(Date.now() + 60_000),
    });

    // Override the token exchange for just this call; other tests keep the
    // default rejection so they never depend on network availability.
    exchangeShopifyCodeForToken.mockResolvedValueOnce({
      accessToken: "shpat_fake_token",
      scope: "read_orders,write_orders",
      refreshToken: "shprt_fake_refresh_token",
      accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      refreshTokenExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });

    const originalFetch = global.fetch;
    global.fetch = jest.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse((init.body as string) ?? "{}");
      if (typeof body.query === "string" && body.query.includes("currentAppInstallation")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          text: async () =>
            JSON.stringify({
              data: {
                shop: { name: "Dev Akedly" },
                currentAppInstallation: { accessScopes: [{ handle: "read_orders" }, { handle: "write_orders" }] },
              },
            }),
        };
      }
      // webhookSubscriptions list + webhookSubscriptionCreate — both succeed, no existing subscription.
      if (typeof body.query === "string" && body.query.includes("webhookSubscriptions")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          text: async () => JSON.stringify({ data: { webhookSubscriptions: { edges: [] } } }),
        };
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        text: async () =>
          JSON.stringify({
            data: { webhookSubscriptionCreate: { webhookSubscription: { id: "gid://x/1" }, userErrors: [] } },
          }),
      };
    }) as unknown as typeof fetch;

    try {
      const url = callbackUrl({ shop: "dev-akedly.myshopify.com", code: "real-code", state: "happy-path-state" });
      const res = await request(app).get(url);

      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/^http:\/\/localhost:3000\/dashboard\/stores\?shopify=connected/);

      const updatedMerchant = await MerchantModel.findById(merchant._id);
      expect(updatedMerchant?.onboardingCompleted).toBe(true);

      const store = await StoreModel.findOne({ merchantId: merchant._id, platform: "shopify" });
      expect(store).not.toBeNull();
      expect(store?.domain).toBe("dev-akedly.myshopify.com");
      expect(store?.status).toBe("connected");
    } finally {
      global.fetch = originalFetch;
    }
  });
});
