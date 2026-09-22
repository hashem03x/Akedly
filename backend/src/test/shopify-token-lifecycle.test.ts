// IMPORTANT: process.env must be set before anything that transitively imports
// config/env.ts is required — ES `import` statements are hoisted above plain
// statements, so any local-module `import` here would load env.ts too early.
// The `export {}` below has no runtime effect — it just forces TypeScript to
// treat this file as its own module scope instead of a global script, so its
// top-level const/function names don't collide with other test files that
// use this same require()-after-process.env pattern.
export {};
process.env.SHOPIFY_CLIENT_ID = "test-client-id";
process.env.SHOPIFY_CLIENT_SECRET = "test-client-secret";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  exchangeShopifyCodeForToken,
  refreshShopifyOfflineToken,
  ShopifyReauthorizationRequiredError,
} = require("../integrations/store-providers/shopify-oauth");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getValidShopifyAccessToken } = require("../integrations/store-providers/shopify-token-service");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { testStoreConnection } = require("../modules/stores/store.service");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { MerchantModel } = require("../modules/merchants/merchant.model");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { StoreModel } = require("../modules/stores/store.model");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { encryptSecret, decryptSecret } = require("../utils/crypto");

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
  jest.resetAllMocks();
});

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

async function createMerchant() {
  return MerchantModel.create({
    name: "Test Merchant",
    email: `merchant_${Date.now()}_${Math.random()}@example.com`,
    passwordHash: "hash",
  });
}

interface StoreFixtureOptions {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
}

async function createShopifyStore(merchantId: string, opts: StoreFixtureOptions = {}) {
  return StoreModel.create({
    merchantId,
    platform: "shopify",
    name: "Dev Akedly",
    domain: "dev-akedly.myshopify.com",
    status: "connected",
    credentials: {
      accessToken: encryptSecret(opts.accessToken ?? "shpat_current"),
      ...(opts.refreshToken ? { refreshToken: encryptSecret(opts.refreshToken) } : {}),
      ...(opts.accessTokenExpiresAt ? { accessTokenExpiresAt: opts.accessTokenExpiresAt } : {}),
      ...(opts.refreshTokenExpiresAt ? { refreshTokenExpiresAt: opts.refreshTokenExpiresAt } : {}),
    },
  });
}

describe("exchangeShopifyCodeForToken", () => {
  it("requests an expiring offline token and parses the full response", async () => {
    let capturedBody: Record<string, unknown> = {};
    global.fetch = jest.fn(async (_url: string, init: RequestInit) => {
      capturedBody = JSON.parse(init.body as string);
      return jsonResponse(200, {
        access_token: "shpat_new",
        scope: "read_orders,write_orders",
        expires_in: 3600,
        refresh_token: "shprt_new",
        refresh_token_expires_in: 7776000,
      });
    }) as unknown as typeof fetch;

    const result = await exchangeShopifyCodeForToken("dev-akedly.myshopify.com", "auth-code");

    expect(capturedBody.expiring).toBe("1");
    expect(capturedBody.code).toBe("auth-code");
    expect(result.accessToken).toBe("shpat_new");
    expect(result.refreshToken).toBe("shprt_new");
    expect(result.accessTokenExpiresAt).toBeInstanceOf(Date);
    expect(result.refreshTokenExpiresAt).toBeInstanceOf(Date);
    // ~1 hour out, generous tolerance for test execution time
    expect(result.accessTokenExpiresAt.getTime() - Date.now()).toBeGreaterThan(3500 * 1000);
  });
});

describe("refreshShopifyOfflineToken", () => {
  it("sends grant_type=refresh_token and returns the new credential", async () => {
    let capturedBody: Record<string, unknown> = {};
    global.fetch = jest.fn(async (_url: string, init: RequestInit) => {
      capturedBody = JSON.parse(init.body as string);
      return jsonResponse(200, {
        access_token: "shpat_refreshed",
        refresh_token: "shprt_refreshed",
        expires_in: 3600,
        refresh_token_expires_in: 7776000,
      });
    }) as unknown as typeof fetch;

    const result = await refreshShopifyOfflineToken("dev-akedly.myshopify.com", "shprt_old");

    expect(capturedBody.grant_type).toBe("refresh_token");
    expect(capturedBody.refresh_token).toBe("shprt_old");
    expect(result.accessToken).toBe("shpat_refreshed");
    expect(result.refreshToken).toBe("shprt_refreshed");
  });

  it("throws ShopifyReauthorizationRequiredError on the documented dead-refresh-token response", async () => {
    global.fetch = jest.fn(async () =>
      jsonResponse(401, { error: "invalid_request", error_description: "This request requires an active refresh_token" })
    ) as unknown as typeof fetch;

    await expect(refreshShopifyOfflineToken("dev-akedly.myshopify.com", "shprt_dead")).rejects.toBeInstanceOf(
      ShopifyReauthorizationRequiredError
    );
  });

  it("throws a plain error (not requiring reauth) for an unrelated failure", async () => {
    global.fetch = jest.fn(async () => jsonResponse(500, {})) as unknown as typeof fetch;

    await expect(refreshShopifyOfflineToken("dev-akedly.myshopify.com", "shprt_x")).rejects.not.toBeInstanceOf(
      ShopifyReauthorizationRequiredError
    );
  });
});

describe("getValidShopifyAccessToken", () => {
  it("returns the current token without calling Shopify when it isn't expiring soon", async () => {
    const merchant = await createMerchant();
    const store = await createShopifyStore(merchant.id, {
      accessToken: "shpat_still_good",
      accessTokenExpiresAt: new Date(Date.now() + 55 * 60 * 1000), // 55 min out, well past the 5-min window
    });
    global.fetch = jest.fn() as unknown as typeof fetch;

    const token = await getValidShopifyAccessToken(store.id);

    expect(token).toBe("shpat_still_good");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("treats a legacy credential (no accessTokenExpiresAt) as requiring reauthorization", async () => {
    const merchant = await createMerchant();
    const store = await createShopifyStore(merchant.id, { accessToken: "shpat_legacy_non_expiring" });
    global.fetch = jest.fn() as unknown as typeof fetch;

    await expect(getValidShopifyAccessToken(store.id)).rejects.toBeInstanceOf(ShopifyReauthorizationRequiredError);
    expect(global.fetch).not.toHaveBeenCalled();

    const updated = await StoreModel.findById(store.id);
    expect(updated.status).toBe("reauth_required");
  });

  it("refreshes an expiring-soon token and persists the new credential", async () => {
    const merchant = await createMerchant();
    const store = await createShopifyStore(merchant.id, {
      accessToken: "shpat_about_to_expire",
      refreshToken: "shprt_valid",
      accessTokenExpiresAt: new Date(Date.now() + 60 * 1000), // 1 min out, inside the 5-min safety window
      refreshTokenExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });
    global.fetch = jest.fn(async () =>
      jsonResponse(200, {
        access_token: "shpat_freshly_refreshed",
        refresh_token: "shprt_freshly_refreshed",
        expires_in: 3600,
        refresh_token_expires_in: 7776000,
      })
    ) as unknown as typeof fetch;

    const token = await getValidShopifyAccessToken(store.id);

    expect(token).toBe("shpat_freshly_refreshed");
    const updated = await StoreModel.findById(store.id).select("+credentials.accessToken +credentials.refreshToken");
    expect(decryptSecret(updated.credentials.accessToken)).toBe("shpat_freshly_refreshed");
    expect(decryptSecret(updated.credentials.refreshToken)).toBe("shprt_freshly_refreshed");
    expect(updated.status).toBe("connected");
  });

  it("refreshes an already-expired token successfully", async () => {
    const merchant = await createMerchant();
    const store = await createShopifyStore(merchant.id, {
      accessToken: "shpat_expired",
      refreshToken: "shprt_valid",
      accessTokenExpiresAt: new Date(Date.now() - 60 * 1000), // already expired
      refreshTokenExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });
    global.fetch = jest.fn(async () =>
      jsonResponse(200, { access_token: "shpat_new_after_expiry", refresh_token: "shprt_new", expires_in: 3600 })
    ) as unknown as typeof fetch;

    const token = await getValidShopifyAccessToken(store.id);
    expect(token).toBe("shpat_new_after_expiry");
  });

  it("requires reauthorization without calling Shopify when the refresh token itself has expired", async () => {
    const merchant = await createMerchant();
    const store = await createShopifyStore(merchant.id, {
      accessToken: "shpat_expired",
      refreshToken: "shprt_also_expired",
      accessTokenExpiresAt: new Date(Date.now() - 60 * 1000),
      refreshTokenExpiresAt: new Date(Date.now() - 1000), // refresh token expired too
    });
    global.fetch = jest.fn() as unknown as typeof fetch;

    await expect(getValidShopifyAccessToken(store.id)).rejects.toBeInstanceOf(ShopifyReauthorizationRequiredError);
    expect(global.fetch).not.toHaveBeenCalled();

    const updated = await StoreModel.findById(store.id);
    expect(updated.status).toBe("reauth_required");
  });

  it("marks the store reauth_required when Shopify rejects the refresh token, and does not retry", async () => {
    const merchant = await createMerchant();
    const store = await createShopifyStore(merchant.id, {
      accessToken: "shpat_expired",
      refreshToken: "shprt_revoked",
      accessTokenExpiresAt: new Date(Date.now() - 60 * 1000),
      refreshTokenExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });
    let callCount = 0;
    global.fetch = jest.fn(async () => {
      callCount += 1;
      return jsonResponse(401, { error: "invalid_request" });
    }) as unknown as typeof fetch;

    await expect(getValidShopifyAccessToken(store.id)).rejects.toBeInstanceOf(ShopifyReauthorizationRequiredError);
    expect(callCount).toBe(1); // one attempt, no internal retry loop

    const updated = await StoreModel.findById(store.id);
    expect(updated.status).toBe("reauth_required");
  });

  it("de-dupes concurrent refresh calls for the same store into a single Shopify request", async () => {
    const merchant = await createMerchant();
    const store = await createShopifyStore(merchant.id, {
      accessToken: "shpat_about_to_expire",
      refreshToken: "shprt_valid",
      accessTokenExpiresAt: new Date(Date.now() + 60 * 1000),
      refreshTokenExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });
    let callCount = 0;
    global.fetch = jest.fn(async () => {
      callCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 20)); // simulate network latency
      return jsonResponse(200, { access_token: "shpat_shared_result", refresh_token: "shprt_shared", expires_in: 3600 });
    }) as unknown as typeof fetch;

    const [tokenA, tokenB, tokenC] = await Promise.all([
      getValidShopifyAccessToken(store.id),
      getValidShopifyAccessToken(store.id),
      getValidShopifyAccessToken(store.id),
    ]);

    expect(callCount).toBe(1);
    expect(tokenA).toBe("shpat_shared_result");
    expect(tokenB).toBe("shpat_shared_result");
    expect(tokenC).toBe("shpat_shared_result");
  });
});

describe("testStoreConnection with a legacy credential", () => {
  it("returns the store marked reauth_required instead of throwing or crashing", async () => {
    const merchant = await createMerchant();
    const store = await createShopifyStore(merchant.id, { accessToken: "shpat_legacy" });
    global.fetch = jest.fn() as unknown as typeof fetch;

    const result = await testStoreConnection(merchant.id, store.id);

    expect(result.status).toBe("reauth_required");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
