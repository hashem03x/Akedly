import { env } from "../config/env";
import { voiceProvider } from "../integrations/voice/voice-provider-factory";
import { Call } from "../models/call.model";
import { Communication } from "../models/communication.model";
import type { OrderDocument } from "../models/order.model";
import { AppError } from "../utils/app-error";

async function startConfirmationCall(order: OrderDocument): Promise<{ externalId: string }> {
  if (!env.publicAppUrl) {
    throw new AppError(
      503,
      "VOICE_WEBHOOK_URL_NOT_CONFIGURED",
      "PUBLIC_APP_URL is not set — cannot build the callback URLs a voice provider needs to reach this server",
    );
  }

  const twimlUrl = `${env.publicAppUrl}/api/v1/webhooks/voice/twiml/${order.id}`;
  const statusCallbackUrl = `${env.publicAppUrl}/api/v1/webhooks/voice/status/${order.id}`;

  const result = await voiceProvider.createCall({
    toPhone: order.customer.phone,
    twimlUrl,
    statusCallbackUrl,
  });

  await Call.create({
    merchantId: order.merchantId,
    customerId: order.customerId,
    orderId: order._id,
    provider: env.voiceProvider,
    externalCallId: result.externalCallId,
    status: result.status,
    startedAt: new Date(),
  });

  await Communication.create({
    merchantId: order.merchantId,
    customerId: order.customerId,
    orderId: order._id,
    channel: "VOICE",
    direction: "OUTBOUND",
    provider: env.voiceProvider,
    externalMessageId: result.externalCallId,
    content: `Voice confirmation call started for order ${order.shopifyOrderNumber}`,
    status: "SENT",
  });

  return { externalId: result.externalCallId };
}

export const VoiceService = { startConfirmationCall };
