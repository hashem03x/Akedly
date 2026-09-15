import type { Request, Response } from "express";
import { env } from "../config/env";
import { verifyWhatsAppSignature } from "../integrations/whatsapp/whatsapp-webhook-verify";
import { Communication } from "../models/communication.model";
import { Order } from "../models/order.model";
import { WebhookEvent } from "../models/webhook-event.model";
import { ConfirmationService } from "../services/confirmation.service";
import { CANCEL_BUTTON_PAYLOAD, CONFIRM_BUTTON_PAYLOAD } from "../services/whatsapp.service";
import { sendSuccess } from "../utils/api-response";
import { AppError } from "../utils/app-error";
import { logger } from "../utils/logger";
import { isDuplicateKeyError } from "../utils/mongo-errors";
import type { CommunicationStatus } from "../types/enums";

function verifyChallenge(req: Request, res: Response): void {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.whatsappVerifyToken && typeof challenge === "string") {
    res.status(200).type("text/plain").send(challenge);
    return;
  }
  res.status(403).end();
}

interface WhatsAppMessage {
  id: string;
  from: string;
  type: string;
  button?: { payload: string; text: string };
}

interface WhatsAppStatus {
  id: string;
  status: string;
}

interface WhatsAppWebhookPayload {
  entry?: {
    changes?: {
      value?: { messages?: WhatsAppMessage[]; statuses?: WhatsAppStatus[] };
    }[];
  }[];
}

function mapWhatsAppStatus(status: string): CommunicationStatus {
  switch (status) {
    case "sent":
      return "SENT";
    case "delivered":
      return "DELIVERED";
    case "read":
      return "READ";
    case "failed":
      return "FAILED";
    default:
      return "SENT";
  }
}

async function processStatusUpdate(status: WhatsAppStatus): Promise<void> {
  await Communication.updateOne(
    { provider: "META", externalMessageId: status.id },
    { status: mapWhatsAppStatus(status.status) },
  );
}

async function processInboundMessage(message: WhatsAppMessage): Promise<void> {
  try {
    await WebhookEvent.create({ provider: "WHATSAPP", externalEventId: message.id, status: "RECEIVED" });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      logger.info("WHATSAPP", `Duplicate inbound message ${message.id} — already processed`);
      return;
    }
    throw error;
  }

  const payload = message.button?.payload;
  if (payload !== CONFIRM_BUTTON_PAYLOAD && payload !== CANCEL_BUTTON_PAYLOAD) {
    logger.info(
      "WHATSAPP",
      `Ignoring inbound message ${message.id} of type "${message.type}" — not a confirm/cancel button reply`,
    );
    return;
  }

  // The MVP sends from a single, shared WhatsApp Business number for every
  // merchant (see whatsapp.service.ts), so an inbound reply is resolved by
  // phone number alone — not merchant-scoped. If the same customer phone
  // has a pending order with more than one merchant at once, this can't
  // safely disambiguate which order the reply is for; a real per-merchant
  // WhatsApp number would remove this limitation.
  const candidates = await Order.find({ "customer.phone": message.from, status: "PENDING_CONFIRMATION" });

  if (candidates.length === 0) {
    logger.warn("WHATSAPP", `No pending order found for the phone number that replied "${payload}"`, {
      from: message.from,
    });
    return;
  }
  if (candidates.length > 1) {
    logger.warn(
      "WHATSAPP",
      `Multiple pending orders found for the same phone number — cannot disambiguate which order "${payload}" applies to`,
      { from: message.from, orderIds: candidates.map((o) => o.id as string) },
    );
    return;
  }

  const order = candidates[0]!;

  await Communication.create({
    merchantId: order.merchantId,
    customerId: order.customerId,
    orderId: order._id,
    channel: "WHATSAPP",
    direction: "INBOUND",
    provider: "META",
    externalMessageId: message.id,
    content: `Customer replied: ${payload}`,
    status: "DELIVERED",
  });

  if (payload === CONFIRM_BUTTON_PAYLOAD) {
    await ConfirmationService.confirmOrder(order.id as string, "WHATSAPP");
  } else {
    await ConfirmationService.cancelOrder(order.id as string, "WHATSAPP");
  }

  await WebhookEvent.updateOne(
    { provider: "WHATSAPP", externalEventId: message.id },
    { status: "PROCESSED", processedAt: new Date() },
  );
}

async function handleEvents(req: Request, res: Response): Promise<void> {
  const signature = req.get("X-Hub-Signature-256") ?? undefined;
  if (!verifyWhatsAppSignature(req.rawBody, signature)) {
    throw new AppError(401, "INVALID_WEBHOOK_SIGNATURE", "WhatsApp webhook signature verification failed");
  }

  const payload = req.body as WhatsAppWebhookPayload;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        await processInboundMessage(message);
      }
      for (const status of change.value?.statuses ?? []) {
        await processStatusUpdate(status);
      }
    }
  }

  sendSuccess(res, { received: true });
}

export const WhatsAppWebhookController = { verifyChallenge, handleEvents };
