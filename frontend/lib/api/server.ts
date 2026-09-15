import type { PublicMerchant } from "@/lib/api/auth";

// Server Component-only fetch helpers. Unlike lib/api/client.ts (used by
// client components, which relies on the browser's cookie jar via
// `credentials: "include"`), these run on the Next.js server and have no
// cookie jar of their own — the caller must forward the incoming request's
// Cookie header explicitly (see `cookies().toString()` in the layouts that
// use these). A server-to-server fetch like this is never subject to CORS.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiErrorBody {
  success: false;
  error: { code: string; message: string };
}

type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

/** Returns null on any failure (network error, 401, etc.) — callers treat that as "not authenticated" / "unavailable", not as an exception to handle. */
export async function fetchFromApiServer<T>(
  path: string,
  cookieHeader: string,
  init: RequestInit = {},
): Promise<T | null> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", Cookie: cookieHeader, ...init.headers },
      cache: "no-store",
    });
  } catch {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!payload || !payload.success) return null;
  return payload.data;
}

export function getCurrentMerchantServer(cookieHeader: string): Promise<{ merchant: PublicMerchant } | null> {
  return fetchFromApiServer("/auth/me", cookieHeader);
}

export interface OverviewStats {
  totalOrders: number;
  pendingConfirmation: number;
  confirmed: number;
  cancelled: number;
  expired: number;
  confirmationRate: number;
}

export function getDashboardOverviewServer(cookieHeader: string): Promise<OverviewStats | null> {
  return fetchFromApiServer("/dashboard/overview", cookieHeader);
}

export interface OrderSummary {
  id: string;
  shopifyOrderNumber: string;
  customer: { name: string; phone: string; email?: string };
  total: number;
  currency: string;
  status: string;
  confirmation: { method?: string };
  createdAt: string;
}

export interface OrdersListResult {
  orders: OrderSummary[];
  total: number;
  page: number;
  limit: number;
}

export function getOrdersServer(cookieHeader: string, query?: string): Promise<OrdersListResult | null> {
  return fetchFromApiServer(`/orders${query ? `?${query}` : ""}`, cookieHeader);
}
