"use client";

import { ApiClientError, type ApiResponse } from "./api-types";

/**
 * Calls the frontend's own /api/v1/* route handlers (same-origin), never the
 * backend directly. The frontend and backend are separately deployed on
 * different domains, so the session cookie lives here on the frontend's own
 * origin — see lib/server-auth-cookie.ts for why. Same-origin means cookies
 * are attached automatically without needing `credentials: "include"`.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!res.ok || !body || !body.success) {
    const error = body && !body.success ? body.error : null;
    throw new ApiClientError(
      res.status,
      error?.code ?? "UNKNOWN_ERROR",
      error?.message ?? "Something went wrong. Please try again.",
      error?.details
    );
  }

  return body.data;
}
