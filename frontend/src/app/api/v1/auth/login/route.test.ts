import { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/server-auth-cookie";
import { POST } from "./route";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.resetAllMocks();
});

function loginRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/auth/login (BFF proxy)", () => {
  it("sets the session cookie on the frontend's own response and never returns the raw token", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { merchant: { id: "m1", name: "Ahmed", email: "ahmed@example.com" }, token: "the-real-jwt" },
      }),
    })) as unknown as typeof fetch;

    const res = await POST(loginRequest({ email: "ahmed@example.com", password: "password123" }));

    const cookie = res.cookies.get(AUTH_COOKIE_NAME);
    expect(cookie?.value).toBe("the-real-jwt");

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.merchant.email).toBe("ahmed@example.com");
    expect(JSON.stringify(body)).not.toContain("the-real-jwt");
  });

  it("forwards a backend failure without setting a cookie", async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." },
      }),
    })) as unknown as typeof fetch;

    const res = await POST(loginRequest({ email: "ahmed@example.com", password: "wrong" }));

    expect(res.status).toBe(401);
    expect(res.cookies.get(AUTH_COOKIE_NAME)).toBeUndefined();
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
  });
});
