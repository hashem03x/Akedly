import "server-only";
import { apiFetchServer } from "./api-server";
import { ApiClientError, type Merchant } from "./api-types";

export async function getServerMerchant(): Promise<Merchant | null> {
  try {
    const data = await apiFetchServer<{ merchant: Merchant }>("/api/v1/auth/me");
    return data.merchant;
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 401) return null;
    throw err;
  }
}
