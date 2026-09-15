import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { MockVoiceProvider } from "./mock-voice-provider";
import { TwilioVoiceProvider } from "./twilio-voice-provider";
import type { VoiceProvider } from "./voice-provider";

function createVoiceProvider(): VoiceProvider {
  const hasTwilioCredentials = Boolean(env.twilioAccountSid && env.twilioAuthToken && env.twilioPhoneNumber);

  if (env.voiceProvider === "twilio" && hasTwilioCredentials) {
    return new TwilioVoiceProvider();
  }

  logger.warn(
    "VOICE",
    `No configured voice provider credentials for "${env.voiceProvider}" — falling back to MockVoiceProvider. Set TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER to place real calls.`,
  );
  return new MockVoiceProvider();
}

export const voiceProvider: VoiceProvider = createVoiceProvider();
