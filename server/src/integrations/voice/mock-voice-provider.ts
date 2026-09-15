import crypto from "node:crypto";
import { logger } from "../../utils/logger";
import type { CreateCallInput, CreateCallResult, GetCallResult, VoiceProvider } from "./voice-provider";

/**
 * Explicit stand-in used only when no real voice provider is configured.
 * It never places a real call and is loud about that in the logs — the
 * point is to keep the confirmation flow runnable end-to-end in dev
 * without Twilio credentials, not to disguise itself as a working
 * integration. See VOICE_NOT_CONFIGURED on TwilioVoiceProvider for the
 * "credentials missing" behavior of the real provider.
 */
export class MockVoiceProvider implements VoiceProvider {
  private readonly calls = new Map<string, string>();

  createCall(input: CreateCallInput): Promise<CreateCallResult> {
    const externalCallId = `mock_${crypto.randomUUID()}`;
    this.calls.set(externalCallId, "queued");
    logger.warn("VOICE", "MockVoiceProvider: no real call was placed (no Twilio credentials configured)", {
      toPhone: input.toPhone,
      externalCallId,
    });
    return Promise.resolve({ externalCallId, status: "queued" });
  }

  getCall(externalCallId: string): Promise<GetCallResult> {
    return Promise.resolve({ externalCallId, status: this.calls.get(externalCallId) ?? "unknown" });
  }
}
