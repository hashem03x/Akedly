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

/** Normalized provider API error — never contains tokens/secrets. */
export interface ProviderApiErrorInfo {
  httpStatus?: number;
  code?: string | number;
  type?: string;
  message: string;
}

export interface SendMessageResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
  errorDetails?: ProviderApiErrorInfo;
}

export interface SendTemplateMessageInput {
  toPhone: string;
  /** e.g. "hello_world" for Meta's built-in test template. */
  templateName: string;
  /** e.g. "en_US". */
  languageCode: string;
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
  /** Generic template send — used for Meta's `hello_world` connectivity test today,
   *  and reusable for future Akedly-approved templates without a new provider method. */
  sendTemplateMessage(input: SendTemplateMessageInput): Promise<SendMessageResult>;
  /**
   * Plain freeform text — only valid within an open 24h WhatsApp customer
   * service window (e.g. immediately after the customer taps a button on a
   * template message, as with the cancellation-reason prompt in
   * confirmation.service.ts). Never used for the first, business-initiated
   * contact — that must go through sendOrderConfirmation's template.
   */
  sendTextMessage(toPhone: string, body: string): Promise<SendMessageResult>;
}
