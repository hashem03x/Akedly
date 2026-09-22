import { NextRequest } from "next/server";

const mockCookieGet = jest.fn();
jest.mock("next/headers", () => ({
  cookies: () => ({ get: mockCookieGet }),
}));

const { GET, POST } = require("./route");

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.resetAllMocks();
});

describe("Catch-all /api/v1/[...path] proxy", () => {
  it("attaches the session token as a Bearer header when the cookie is present", async () => {
    mockCookieGet.mockReturnValue({ value: "the-jwt-token" });
    let capturedInit: RequestInit | undefined;
    let capturedUrl: string | undefined;
    global.fetch = jest.fn(async (url: string, init: RequestInit) => {
      capturedUrl = url;
      capturedInit = init;
      return {
        status: 200,
        headers: { get: () => "application/json" },
        text: async () => JSON.stringify({ success: true, data: { stores: [] } }),
      };
    }) as unknown as typeof fetch;

    const req = new NextRequest("http://localhost:3000/api/v1/stores?page=2");
    const res = await GET(req, { params: { path: ["stores"] } });

    expect(capturedUrl).toMatch(/\/api\/v1\/stores\?page=2$/);
    expect((capturedInit?.headers as Record<string, string>).Authorization).toBe("Bearer the-jwt-token");
    expect(res.status).toBe(200);
  });

  it("omits the Authorization header entirely when there is no session cookie", async () => {
    mockCookieGet.mockReturnValue(undefined);
    let capturedInit: RequestInit | undefined;
    global.fetch = jest.fn(async (_url: string, init: RequestInit) => {
      capturedInit = init;
      return {
        status: 401,
        headers: { get: () => "application/json" },
        text: async () => JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "x" } }),
      };
    }) as unknown as typeof fetch;

    const req = new NextRequest("http://localhost:3000/api/v1/stores");
    await GET(req, { params: { path: ["stores"] } });

    expect(capturedInit?.headers as Record<string, string>).not.toHaveProperty("Authorization");
  });

  it("forwards the request body for non-GET methods", async () => {
    mockCookieGet.mockReturnValue({ value: "the-jwt-token" });
    let capturedBody: unknown;
    global.fetch = jest.fn(async (_url: string, init: RequestInit) => {
      capturedBody = init.body;
      return {
        status: 200,
        headers: { get: () => "application/json" },
        text: async () => JSON.stringify({ success: true, data: {} }),
      };
    }) as unknown as typeof fetch;

    const req = new NextRequest("http://localhost:3000/api/v1/merchants/onboarding-complete", {
      method: "POST",
      body: JSON.stringify({ foo: "bar" }),
    });
    await POST(req, { params: { path: ["merchants", "onboarding-complete"] } });

    expect(capturedBody).toBe(JSON.stringify({ foo: "bar" }));
  });
});
