import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { defaultLocale } from "@/i18n";
import { AUTH_COOKIE_NAME, backendApiUrl } from "@/lib/server-auth-cookie";

/**
 * The "Connect Shopify" button does a real top-level browser navigation here
 * (not fetch) because the backend needs to 302 the browser on to Shopify's own
 * authorize page. That means the browser can't attach a bearer header itself,
 * and it has no cookie for the backend's domain to send automatically either
 * (see the auth persistence fix in server-auth-cookie.ts) — so this route
 * authenticates server-to-server using our own cookie, captures the backend's
 * redirect Location without following it, and re-issues that same redirect to
 * the browser. The backend's OAuth start/callback logic itself is untouched.
 */
export async function GET(req: NextRequest) {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL(`/${defaultLocale}/login`, req.url));
  }

  const shop = req.nextUrl.searchParams.get("shop") ?? "";
  const targetUrl = `${backendApiUrl()}/api/v1/integrations/shopify/oauth/start?shop=${encodeURIComponent(shop)}`;

  const backendRes = await fetch(targetUrl, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: "manual",
  });

  const location = backendRes.headers.get("location");
  if (!location) {
    return NextResponse.redirect(
      new URL(`/${defaultLocale}/dashboard/stores?shopify=error&code=server_error`, req.url)
    );
  }

  return NextResponse.redirect(location);
}
