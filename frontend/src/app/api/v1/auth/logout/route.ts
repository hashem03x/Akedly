import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/server-auth-cookie";

// JWTs are stateless — the backend has nothing to invalidate server-side, so
// clearing the frontend's own cookie is sufficient (matches how the backend's
// own /auth/logout, still used by any direct API consumer, behaves too).
export async function POST() {
  const response = NextResponse.json({ success: true, data: { ok: true } });
  clearAuthCookie(response);
  return response;
}
