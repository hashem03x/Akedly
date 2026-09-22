import { NextResponse, type NextRequest } from "next/server";
import { backendApiUrl, setAuthCookie } from "@/lib/server-auth-cookie";

export async function POST(req: NextRequest) {
  const body = await req.text();

  const backendRes = await fetch(`${backendApiUrl()}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });

  const payload = (await backendRes.json().catch(() => null)) as
    | { success: true; data: { merchant: unknown; token: string } }
    | { success: false; error: { code: string; message: string; details?: unknown } }
    | null;

  if (!backendRes.ok || !payload || !payload.success) {
    return NextResponse.json(
      payload ?? { success: false, error: { code: "UNKNOWN_ERROR", message: "Registration failed." } },
      { status: backendRes.status || 502 }
    );
  }

  const response = NextResponse.json(
    { success: true, data: { merchant: payload.data.merchant } },
    { status: backendRes.status }
  );
  setAuthCookie(response, payload.data.token);
  return response;
}
