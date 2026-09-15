import { env } from "../../config/env";
import { AppError } from "../../utils/app-error";
import { logger } from "../../utils/logger";
import type { CreateCallInput, CreateCallResult, GetCallResult, VoiceProvider } from "./voice-provider";

const API_BASE = "https://api.twilio.com/2010-04-01";

interface TwilioCallResponse {
  sid: string;
  status: string;
  message?: string;
}

export class TwilioVoiceProvider implements VoiceProvider {
  private requireConfig(): { accountSid: string; authToken: string; fromNumber: string } {
    if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioPhoneNumber) {
      throw new AppError(
        503,
        "VOICE_NOT_CONFIGURED",
        "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER are not set — cannot place voice calls",
      );
    }
    return {
      accountSid: env.twilioAccountSid,
      authToken: env.twilioAuthToken,
      fromNumber: env.twilioPhoneNumber,
    };
  }

  private authHeader(accountSid: string, authToken: string): string {
    return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
  }

  async createCall(input: CreateCallInput): Promise<CreateCallResult> {
    const { accountSid, authToken, fromNumber } = this.requireConfig();

    const body = new URLSearchParams({
      To: input.toPhone,
      From: fromNumber,
      Url: input.twimlUrl,
      StatusCallback: input.statusCallbackUrl,
    });
    ["initiated", "ringing", "answered", "completed"].forEach((event) =>
      body.append("StatusCallbackEvent", event),
    );

    const response = await fetch(`${API_BASE}/Accounts/${accountSid}/Calls.json`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader(accountSid, authToken),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const payload = (await response.json()) as TwilioCallResponse;

    if (!response.ok) {
      logger.error("VOICE", "Twilio call creation failed", { status: response.status, message: payload.message });
      throw new AppError(502, "VOICE_CALL_FAILED", payload.message ?? `Twilio call creation failed with status ${response.status}`);
    }

    return { externalCallId: payload.sid, status: payload.status };
  }

  async getCall(externalCallId: string): Promise<GetCallResult> {
    const { accountSid, authToken } = this.requireConfig();

    const response = await fetch(`${API_BASE}/Accounts/${accountSid}/Calls/${externalCallId}.json`, {
      headers: { Authorization: this.authHeader(accountSid, authToken) },
    });

    const payload = (await response.json()) as TwilioCallResponse;

    if (!response.ok) {
      throw new AppError(502, "VOICE_CALL_LOOKUP_FAILED", payload.message ?? `Twilio call lookup failed with status ${response.status}`);
    }

    return { externalCallId: payload.sid, status: payload.status };
  }
}
