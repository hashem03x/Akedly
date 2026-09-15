export interface CreateCallInput {
  toPhone: string;
  /** TwiML-returning URL Twilio (or another provider) fetches when the call connects. */
  twimlUrl: string;
  /** Where the provider should POST call status changes. */
  statusCallbackUrl: string;
}

export interface CreateCallResult {
  externalCallId: string;
  status: string;
}

export interface GetCallResult {
  externalCallId: string;
  status: string;
}

/**
 * Abstraction over an outbound-voice-call provider. Business logic
 * (ConfirmationService, VoiceService) depends only on this interface —
 * never on Twilio (or any other provider) directly.
 */
export interface VoiceProvider {
  createCall(input: CreateCallInput): Promise<CreateCallResult>;
  getCall(externalCallId: string): Promise<GetCallResult>;
}
