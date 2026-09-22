import { AUTH_COOKIE_NAME } from "@/lib/server-auth-cookie";
import { POST } from "./route";

describe("POST /api/v1/auth/logout (BFF proxy)", () => {
  it("clears the session cookie", async () => {
    const res = await POST();

    const cookie = res.cookies.get(AUTH_COOKIE_NAME);
    expect(cookie).toBeDefined();
    expect(cookie?.value).toBe("");

    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
