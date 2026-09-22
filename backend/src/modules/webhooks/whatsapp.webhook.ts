import type { Request, Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import { env } from "../../config/env";
import { asyncHandler } from "../../middleware/error.middleware";
import { sendError, sendSuccess } from "../../utils/api-response";
import { logger } from "../../utils/logger";
import { ApiError } from "../../utils/api-error";
import { OrderModel } from "../orders/order.model";
import { recordCommunication } from "../communications/communication.service";
import { confirmOrder, cancelOrder } from "../confirmations/confirmation.service";
import { claimWebhookEvent } from "./webhook-event.model";

/** Meta requires GET verification of the callback URL when it's first configured. */
export const verifyWhatsAppWebhook = (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.whatsapp.metaVerifyToken && env.whatsapp.metaVerifyToken) {
    res.status(200).send(challenge);
    return;
  }
  res.status(403).send("Verification failed");
};

interface MetaButtonReply {
  id: string;
  title?: string;
}

interface MetaWebhookEntry {
  changes?: {
    value?: {
      messages?: { id?: string; from?: string; interactive?: { button_reply?: MetaButtonReply } }[];
    };
  }[];
}

function parseButtonId(buttonId: string): { action: "confirm" | "cancel" | null; orderId: string | null } {
  const [action, orderId] = buttonId.split(":");
  if (action !== "confirm" && action !== "cancel") return { action: null, orderId: null };
  return { action, orderId: orderId ?? null };
}

export const handleWhatsAppWebhook = asyncHandler(async (req: Request, res: Response) => {
  const rawBody = req.body as Buffer;

  if (env.whatsapp.metaAppSecret) {
    const signature = req.header("x-hub-signature-256");
    const computed =
      "sha256=" + crypto.createHmac("sha256", env.whatsapp.metaAppSecret).update(rawBody).digest("hex");
    if (!signature || !safeEqual(signature, computed)) {
      return sendError(res, 401, "INVALID_SIGNATURE", "Webhook signature verification failed.");
    }
  }

  const payload = JSON.parse(rawBody.toString("utf8")) as { entry?: MetaWebhookEntry[] };
  const messages = (payload.entry ?? [])
    .flatMap((entry) => entry.changes ?? [])
    .flatMap((change) => change.value?.messages ?? []);

  for (const message of messages) {
    await processInboundMessage(message.id, message.interactive?.button_reply);
  }

  // Always 200 quickly so Meta doesn't retry; per-message failures are logged, not surfaced.
  sendSuccess(res, { received: messages.length });
});

async function processInboundMessage(
  providerMessageId: string | undefined,
  buttonReply: MetaButtonReply | undefined
): Promise<void> {
  if (!buttonReply) return;

  const idempotencyKey = providerMessageId ?? `${buttonReply.id}:${Date.now()}`;
  const isNewDelivery = await claimWebhookEvent("whatsapp", idempotencyKey);
  if (!isNewDelivery) return;

  const { action, orderId } = parseButtonId(buttonReply.id);
  if (!action || !orderId) {
    logger.warn("WhatsApp webhook: unrecognized button payload", { buttonId: buttonReply.id });
    return;
  }

  const order = await OrderModel.findById(orderId);
  if (!order) {
    logger.warn("WhatsApp webhook: order not found for button reply", { orderId });
    return;
  }

  try {
    const updated =
      action === "confirm"
        ? await confirmOrder(order.id, { channel: "whatsapp", providerMessageId })
        : await cancelOrder(order.id, { channel: "whatsapp", providerMessageId });

    await recordCommunication({
      merchantId: String(updated.merchantId),
      orderId: updated.id,
      channel: "whatsapp",
      direction: "inbound",
      type: "confirmation_response",
      status: action === "confirm" ? "confirmed" : "cancelled",
      providerMessageId,
    });
  } catch (err) {
    if (err instanceof ApiError && err.code === "INVALID_TRANSITION") {
      await recordCommunication({
        merchantId: String(order.merchantId),
        orderId: order.id,
        channel: "whatsapp",
        direction: "inbound",
        type: "confirmation_response",
        status: "invalid",
        providerMessageId,
        metadata: { attemptedAction: action, currentStatus: order.confirmationStatus },
      });
      return;
    }
    throw err;
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

const simulateSchema = z.object({
  orderId: z.string().min(1),
  action: z.enum(["confirm", "cancel"]),
});

/**
 * Dev-only: lets the full order -> WhatsApp confirmation -> response loop be tested
 * locally without real WhatsApp credentials. Mirrors what a real button-reply webhook
 * does. Disabled whenever the mock provider isn't active.
 */
export const simulateWhatsAppReply = asyncHandler(async (req: Request, res: Response) => {
  if (env.whatsapp.provider !== "mock") {
    return sendError(res, 403, "SIMULATION_DISABLED", "Simulation is only available in mock mode.");
  }

  const input = simulateSchema.parse(req.body);
  await processInboundMessage(`sim_${crypto.randomUUID()}`, {
    id: `${input.action}:${input.orderId}`,
  });

  const order = await OrderModel.findById(input.orderId);
  sendSuccess(res, { order });
});
