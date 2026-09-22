// IMPORTANT: process.env must be set before anything that transitively imports
// config/env.ts is required — ES `import` statements are hoisted above plain
// statements, so any local-module `import` here would load env.ts too early.
process.env.SHOPIFY_API_VERSION = "2024-07";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ShopifyProvider } = require("../integrations/store-providers/shopify.provider");

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.resetAllMocks();
});

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
    text: async () => JSON.stringify(body),
  };
}

describe("ShopifyProvider (GraphQL Admin API)", () => {
  describe("testConnection", () => {
    it("calls the GraphQL endpoint, not REST, and returns the shop name on success", async () => {
      let capturedUrl: string | undefined;
      let capturedInit: RequestInit | undefined;
      global.fetch = jest.fn(async (url: string, init: RequestInit) => {
        capturedUrl = url;
        capturedInit = init;
        return jsonResponse(200, {
          data: {
            shop: { name: "Leopard" },
            currentAppInstallation: { accessScopes: [{ handle: "read_orders" }, { handle: "write_orders" }] },
          },
        });
      }) as unknown as typeof fetch;

      const provider = new ShopifyProvider();
      const result = await provider.testConnection({
        domain: "dev-akedly.myshopify.com",
        accessToken: "shpat_test",
      });

      expect(result).toEqual({ ok: true, storeName: "Leopard" });
      expect(capturedUrl).toBe("https://dev-akedly.myshopify.com/admin/api/2024-07/graphql.json");
      expect(capturedUrl).not.toContain("shop.json");
      expect((capturedInit?.headers as Record<string, string>)["X-Shopify-Access-Token"]).toBe("shpat_test");
      const body = JSON.parse(capturedInit?.body as string);
      expect(body.query).toContain("currentAppInstallation");
    });

    it("surfaces an HTTP 403 (REST-access-disabled style failure) as a safe error", async () => {
      global.fetch = jest.fn(async () =>
        jsonResponse(403, { errors: "This app is not approved to make this API call." })
      ) as unknown as typeof fetch;

      const provider = new ShopifyProvider();
      const result = await provider.testConnection({
        domain: "dev-akedly.myshopify.com",
        accessToken: "shpat_test",
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain("403");
    });

    it("treats a 200 response carrying a GraphQL `errors` array as a failure", async () => {
      global.fetch = jest.fn(async () =>
        jsonResponse(200, { errors: [{ message: "Access denied for shop", extensions: { code: "ACCESS_DENIED" } }] })
      ) as unknown as typeof fetch;

      const provider = new ShopifyProvider();
      const result = await provider.testConnection({
        domain: "dev-akedly.myshopify.com",
        accessToken: "shpat_test",
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Access denied for shop");
    });

    it("fails safely without a token, never making a request", async () => {
      global.fetch = jest.fn() as unknown as typeof fetch;
      const provider = new ShopifyProvider();
      const result = await provider.testConnection({ domain: "dev-akedly.myshopify.com" });

      expect(result).toEqual({ ok: false, error: "Missing Shopify access token." });
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("registerWebhooks", () => {
    it("skips creating a subscription when one already exists for this address/topic", async () => {
      global.fetch = jest.fn(async () =>
        jsonResponse(200, { data: { webhookSubscriptions: { edges: [{ node: { id: "gid://shopify/WebhookSubscription/1" } }] } } })
      ) as unknown as typeof fetch;

      const provider = new ShopifyProvider();
      await provider.registerWebhooks(
        { domain: "dev-akedly.myshopify.com", accessToken: "shpat_test" },
        "https://akedly-backend.vercel.app"
      );

      expect(global.fetch).toHaveBeenCalledTimes(1); // list only, no create mutation
    });

    it("creates a subscription via GraphQL when none exists", async () => {
      const calls: string[] = [];
      global.fetch = jest.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(init.body as string);
        calls.push(body.query as string);
        if (calls.length === 1) {
          return jsonResponse(200, { data: { webhookSubscriptions: { edges: [] } } });
        }
        return jsonResponse(200, {
          data: {
            webhookSubscriptionCreate: {
              webhookSubscription: { id: "gid://shopify/WebhookSubscription/2" },
              userErrors: [],
            },
          },
        });
      }) as unknown as typeof fetch;

      const provider = new ShopifyProvider();
      await provider.registerWebhooks(
        { domain: "dev-akedly.myshopify.com", accessToken: "shpat_test" },
        "https://akedly-backend.vercel.app"
      );

      expect(calls).toHaveLength(2);
      expect(calls[1]).toContain("webhookSubscriptionCreate");
    });

    it("throws when Shopify reports userErrors on the create mutation", async () => {
      let callCount = 0;
      global.fetch = jest.fn(async () => {
        callCount += 1;
        if (callCount === 1) return jsonResponse(200, { data: { webhookSubscriptions: { edges: [] } } });
        return jsonResponse(200, {
          data: {
            webhookSubscriptionCreate: {
              webhookSubscription: null,
              userErrors: [{ field: ["callbackUrl"], message: "is invalid" }],
            },
          },
        });
      }) as unknown as typeof fetch;

      const provider = new ShopifyProvider();
      await expect(
        provider.registerWebhooks(
          { domain: "dev-akedly.myshopify.com", accessToken: "shpat_test" },
          "https://akedly-backend.vercel.app"
        )
      ).rejects.toThrow(/is invalid/);
    });
  });

  describe("syncOrderStatus", () => {
    it("tags the order via the tagsAdd GraphQL mutation using a GID, not the REST orders endpoint", async () => {
      let capturedUrl: string | undefined;
      let capturedVariables: unknown;
      global.fetch = jest.fn(async (url: string, init: RequestInit) => {
        capturedUrl = url;
        capturedVariables = JSON.parse(init.body as string).variables;
        return jsonResponse(200, { data: { tagsAdd: { userErrors: [] } } });
      }) as unknown as typeof fetch;

      const provider = new ShopifyProvider();
      await provider.syncOrderStatus(
        { domain: "dev-akedly.myshopify.com", accessToken: "shpat_test" },
        { externalOrderId: "5551234", status: "confirmed" }
      );

      expect(capturedUrl).toContain("/graphql.json");
      expect(capturedUrl).not.toContain("orders/5551234.json");
      expect(capturedVariables).toEqual({ id: "gid://shopify/Order/5551234", tags: ["akedly-confirmed"] });
    });

    it("throws when tagsAdd returns userErrors", async () => {
      global.fetch = jest.fn(async () =>
        jsonResponse(200, { data: { tagsAdd: { userErrors: [{ field: ["id"], message: "not found" }] } } })
      ) as unknown as typeof fetch;

      const provider = new ShopifyProvider();
      await expect(
        provider.syncOrderStatus(
          { domain: "dev-akedly.myshopify.com", accessToken: "shpat_test" },
          { externalOrderId: "999", status: "cancelled" }
        )
      ).rejects.toThrow(/not found/);
    });
  });
});
