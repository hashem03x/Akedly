/**
 * fetch() has no default timeout — a hung upstream (Meta, Shopify, WooCommerce)
 * would otherwise hang the calling request indefinitely, which is especially
 * dangerous now that webhook handlers await outbound sends before
 * acknowledging Shopify/WooCommerce (see shopify.webhook.ts). Every outbound
 * integration call should go through this instead of bare fetch().
 */
export class FetchTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`);
    this.name = "FetchTimeoutError";
  }
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 10_000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new FetchTimeoutError(url, timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
