import type { Response } from "express";
import { isProduction } from "../config/env";
import { AUTH_TOKEN_TTL_SECONDS } from "./jwt";

export const AUTH_COOKIE_NAME = "akedly_token";

// sameSite: "lax" covers both local dev (frontend/backend differ only by
// port — same registrable "site") and production (api.akedly.com /
// app.akedly.com — different subdomains, same registrable domain), without
// needing "none" (which would also require secure:true and break http
// localhost testing).
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
};

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...COOKIE_OPTIONS,
    maxAge: AUTH_TOKEN_TTL_SECONDS * 1000,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, COOKIE_OPTIONS);
}
