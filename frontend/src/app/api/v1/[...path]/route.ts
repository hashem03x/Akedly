import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, backendApiUrl } from "@/lib/server-auth-cookie";

/**
 * Generic authenticated proxy: every /api/v1/* call the frontend makes (other
 * than login/register/logout, which have their own routes for cookie handling)
 * lands here. It reads the session token from the frontend's own cookie and
 * forwards it to the backend as a Bearer token — a plain server-to-server
 * request, not subject to browser CORS/cookie-domain rules — then relays the
 * backend's response back to the browser unchanged.
 *
 * Next.js matches more specific static routes (auth/login, auth/register,
 * auth/logout, integrations/shopify/oauth/start) before falling back to this
 * catch-all, so those paths never reach here.
 */
async function proxy(req: NextRequest, path: string[]): Promise<NextResponse> {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  const targetUrl = `${backendApiUrl()}/api/v1/${path.join("/")}${req.nextUrl.search}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const init: RequestInit = { method: req.method, headers, cache: "no-store" };
  if (req.method !== "GET" && req.method !== "HEAD") {
    const body = await req.text();
    if (body) init.body = body;
  }

  const backendRes = await fetch(targetUrl, init);
  const text = await backendRes.text();

  return new NextResponse(text, {
    status: backendRes.status,
    headers: { "Content-Type": backendRes.headers.get("Content-Type") ?? "application/json" },
  });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path);
}
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path);
}
export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path);
}
export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path);
}
export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path);
}
