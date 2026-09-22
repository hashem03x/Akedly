export type MessageLanguage = "ar" | "en";

export interface OrderConfirmationMessageInput {
  orderId: string;
  toPhone: string;
  language: MessageLanguage;
  customerName: string;
  storeName: string;
  orderNumber: string;
  items: { name: string; quantity: number }[];
  total: number;
  currency: string;
}

export interface SendMessageResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

/**
 * Inbound button reply, already parsed from whichever provider sent it.
 * action is null when the reply couldn't be mapped to confirm/cancel.
 */
export interface InboundConfirmationReply {
  orderId: string;
  action: "confirm" | "cancel" | null;
  providerMessageId?: string;
  raw?: unknown;
}

/**
 * Replaceable WhatsApp integration. The rest of the app only talks to this interface —
 * never to a specific provider SDK — so swapping Meta/Twilio/mock requires no other changes.
 */
export interface WhatsAppProvider {
  readonly name: string;
  sendOrderConfirmation(input: OrderConfirmationMessageInput): Promise<SendMessageResult>;
}
