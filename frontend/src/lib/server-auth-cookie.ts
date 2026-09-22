import "server-only";
import type { NextResponse } from "next/server";
import { API_URL } from "./config";

/**
 * The frontend and backend are deployed on different registrable domains
 * (frontend-*.vercel.app / akedly-backend.vercel.app — both under the
 * `vercel.app` public suffix, so genuinely different "sites"). A cookie set by
 * the backend directly is never visible to the Next.js server, so Server
 * Components can never read it — that's the root cause this file exists to fix.
 *
 * Instead, the Next.js server itself becomes the single place the session
 * cookie lives: /api/v1/auth/login and /register set it here (after verifying
 * credentials against the backend server-to-server, which isn't subject to
 * browser cookie/CORS rules), and every other server-side read — this cookie,
 * apiFetchServer, the catch-all proxy — treats it as the one source of truth.
 */
export const AUTH_COOKIE_NAME = "akedly_token";
const AUTH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export function backendApiUrl(): string {
  return API_URL;
}

export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Same-origin now that the cookie lives on the frontend's own domain —
    // "lax" is strictly more protective than the "none" the old cross-site
    // design required, and works identically in dev and prod.
    sameSite: "lax",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}
