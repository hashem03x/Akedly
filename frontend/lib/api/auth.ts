import { apiFetch } from "@/lib/api/client";

export interface PublicMerchant {
  id: string;
  name: string;
  email: string;
  businessName?: string;
  phone?: string;
  platform?: string;
  createdAt: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  businessName?: string;
  phone?: string;
  platform?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export function registerMerchant(payload: RegisterPayload): Promise<{ merchant: PublicMerchant }> {
  return apiFetch("/auth/register", { method: "POST", body: JSON.stringify(payload) });
}

export function loginMerchant(payload: LoginPayload): Promise<{ merchant: PublicMerchant }> {
  return apiFetch("/auth/login", { method: "POST", body: JSON.stringify(payload) });
}

export function getCurrentMerchant(): Promise<{ merchant: PublicMerchant }> {
  return apiFetch("/auth/me");
}

export function logoutMerchant(): Promise<{ loggedOut: boolean }> {
  return apiFetch("/auth/logout", { method: "POST" });
}
