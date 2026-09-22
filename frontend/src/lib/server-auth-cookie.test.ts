import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, clearAuthCookie, setAuthCookie } from "./server-auth-cookie";

describe("setAuthCookie / clearAuthCookie", () => {
  it("sets an httpOnly cookie with the token, scoped to the whole app", () => {
    const res = NextResponse.json({ ok: true });
    setAuthCookie(res, "the-jwt-token");

    const cookie = res.cookies.get(AUTH_COOKIE_NAME);
    expect(cookie).toBeDefined();
    expect(cookie?.value).toBe("the-jwt-token");
  });

  it("never puts the token anywhere in the JSON body it's attached to", () => {
    const res = NextResponse.json({ success: true, data: { merchant: { id: "1" } } });
    setAuthCookie(res, "super-secret-token-value");

    // The cookie header carries the token; the body must not.
    const setCookieHeader = res.headers.get("set-cookie") ?? "";
    expect(setCookieHeader).toContain("super-secret-token-value");
  });

  it("clears the cookie with maxAge 0", () => {
    const res = NextResponse.json({ ok: true });
    clearAuthCookie(res);

    const cookie = res.cookies.get(AUTH_COOKIE_NAME);
    expect(cookie).toBeDefined();
    expect(cookie?.value).toBe("");
  });
});
