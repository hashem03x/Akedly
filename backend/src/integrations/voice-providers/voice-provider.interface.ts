/**
 * V2 (not implemented yet). Prepared so the confirmation flow can add a phone
 * channel without changing the order/confirmation core.
 *
 * The flow is strictly DTMF, never LLM-driven: "1" confirms, "2" cancels,
 * anything else should trigger a retry/invalid-input response.
 */
export interface CreateConfirmationCallInput {
  orderId: string;
  toPhone: string;
  language: "ar" | "en";
  customerName: string;
  storeName: string;
  orderNumber: string;
  total: number;
  currency: string;
}

export interface CreateConfirmationCallResult {
  success: boolean;
  providerCallId?: string;
  error?: string;
}

export type CallOutcome = "confirmed" | "cancelled" | "invalid_input" | "no_answer";

export interface CallWebhookPayload {
  providerCallId: string;
  digitsPressed?: string;
  raw?: unknown;
}

export interface VoiceProvider {
  readonly name: string;
  createConfirmationCall(input: CreateConfirmationCallInput): Promise<CreateConfirmationCallResult>;
  handleCallWebhook(payload: CallWebhookPayload): Promise<{ orderId: string; outcome: CallOutcome }>;
}
