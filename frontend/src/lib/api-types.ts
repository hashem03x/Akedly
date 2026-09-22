export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface Merchant {
  id: string;
  name: string;
  email: string;
  plan: string;
  onboardingCompleted: boolean;
  createdAt: string;
}

export type StorePlatform = "shopify" | "woocommerce";
export type StoreStatus = "connected" | "disconnected" | "error" | "reauth_required";

export interface StoreSettings {
  autoConfirmationEnabled: boolean;
  confirmationChannel: "whatsapp";
  messageLanguage: "ar" | "en";
}

export interface Store {
  id: string;
  platform: StorePlatform;
  name: string;
  domain: string;
  status: StoreStatus;
  lastConnectionTestAt: string | null;
  lastConnectionError: string | null;
  settings: StoreSettings;
  createdAt: string;
}

export type ConfirmationStatus = "pending" | "confirmed" | "cancelled" | "expired";

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  storeId: string;
  externalOrderId: string;
  orderNumber: string;
  customer: { name: string; phone: string; email?: string };
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  platform: StorePlatform;
  confirmationStatus: ConfirmationStatus;
  confirmationChannel: "whatsapp" | "phone" | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationEvent {
  id: string;
  channel: "system" | "whatsapp" | "phone";
  direction: "outbound" | "inbound";
  type: string;
  status: string;
  providerMessageId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface OverviewMetrics {
  ordersToday: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  confirmationRate: number;
}
