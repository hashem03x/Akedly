import "server-only";
import { cookies } from "next/headers";
import { API_URL } from "./config";
import { ApiClientError, type ApiResponse } from "./api-types";

export async function apiFetchServer<T>(path: string, init?: RequestInit): Promise<T> {
  const token = cookies().get("akedly_token")?.value;

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Cookie: `akedly_token=${token}` } : {}),
      ...init?.headers,
    },
  });

  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!res.ok || !body || !body.success) {
    const error = body && !body.success ? body.error : null;
    throw new ApiClientError(
      res.status,
      error?.code ?? "UNKNOWN_ERROR",
      error?.message ?? "Something went wrong.",
      error?.details
    );
  }

  return body.data;
}
