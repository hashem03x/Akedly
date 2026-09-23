import type { Request, Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import { env } from "../../config/env";
import { asyncHandler } from "../../middleware/error.middleware";
import { sendError, sendSuccess } from "../../utils/api-response";
import { logger } from "../../utils/logger";
import { generateRequestId, runWithRequestId } from "../../utils/request-context";
import { maskPhone } from "../../utils/mask";
import { ApiError } from "../../utils/api-error";
import { OrderModel } from "../orders/order.model";
import type { CommunicationDocument } from "../communications/communication.model";
import { recordCommunication, updateCommunicationStatusByProviderMessageId } from "../communications/communication.service";
import { confirmOrder, cancelOrder } from "../confirmations/confirmation.service";
import { claimWebhookEvent, completeWebhookEvent, failWebhookEvent } from "./webhook-event.model";

/** Meta requires GET verification of the callback URL when it's first configured. */
export const verifyWhatsAppWebhook = (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const configuredToken = env.whatsapp.metaVerifyToken;
  const exactMatch = typeof token === "string" && token === configuredToken;

  if (mode === "subscribe" && configuredToken.length > 0 && exactMatch) {
    logger.info("whatsapp_webhook_verification_succeeded", { hubMode: mode });
    res.status(200).send(challenge);
    return;
  }

  // Booleans/lengths only — never the token values — so a future misconfiguration
  // (blank var, stale deploy, whitespace) is diagnosable from logs alone.
  logger.warn("whatsapp_webhook_verification_failed", {
    hubModeIsSubscribe: mode === "subscribe",
    verifyTokenConfigured: configuredToken.length > 0,
    tokenReceived: typeof token === "string",
  });
  res.status(403).send("Verification failed");
};

interface MetaButtonReply {
  id: string;
  title?: string;
}

interface MetaMessage {
  id: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  interactive?: { button_reply?: MetaButtonReply };
}

interface MetaStatusError {
  code?: number;
  title?: string;
}

interface MetaStatus {
  id: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: MetaStatusError[];
}

interface MetaChangeValue {
  metadata?: { phone_number_id?: string };
  messages?: MetaMessage[];
  statuses?: MetaStatus[];
}

interface MetaWebhookEntry {
  changes?: { field?: string; value?: MetaChangeValue }[];
}

interface MetaWebhookPayload {
  entry?: MetaWebhookEntry[];
}

const VALID_STATUS_VALUES = new Set(["sent", "delivered", "read", "failed"]);

/**
 * Flattens a Meta webhook payload into the messages/statuses it carries.
 * Deliberately defensive: any missing/unexpected shape (a field we don't
 * subscribe to, a batch with no changes, etc.) just yields empty arrays
 * instead of throwing — unknown event types must be safely acknowledged.
 */
export function parseWhatsAppWebhookPayload(payload: MetaWebhookPayload): {
  messages: MetaMessage[];
  statuses: MetaStatus[];
} {
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  const values = entries
    .flatMap((entry) => (Array.isArray(entry?.changes) ? entry.changes : []))
    .map((change) => change?.value)
    .filter((value): value is MetaChangeValue => Boolean(value));

  return {
    messages: values.flatMap((value) => (Array.isArray(value.messages) ? value.messages : [])),
    statuses: values.flatMap((value) => (Array.isArray(value.statuses) ? value.statuses : [])),
  };
}

function parseButtonId(buttonId: string): { action: "confirm" | "cancel" | null; orderId: string | null } {
  const [action, orderId] = buttonId.split(":");
  if (action !== "confirm" && action !== "cancel") return { action: null, orderId: null };
  return { action, orderId: orderId ?? null };
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export const handleWhatsAppWebhook = asyncHandler(async (req: Request, res: Response) =>
  runWithRequestId(generateRequestId(), () => handleWhatsAppWebhookInner(req, res))
);

async function handleWhatsAppWebhookInner(req: Request, res: Response) {
  const rawBody = req.body as Buffer;
  const signature = req.header("x-hub-signature-256");

  // Logged unconditionally, before signature verification — otherwise a request
  // that gets rejected below (bad/missing secret, bad signature) leaves zero
  // trace, and "Meta never sent this webhook" becomes indistinguishable from
  // "Meta sent it but Akedly rejected it". Never logs the signature value itself.
  logger.info("whatsapp_status_webhook_received", {
    method: req.method,
    path: req.path,
    hasSignature: Boolean(signature),
    contentType: req.header("content-type") ?? null,
    bodyLength: Buffer.isBuffer(rawBody) ? rawBody.length : 0,
  });

  // Signature verification is mandatory, not best-effort: a missing app secret
  // is a deployment misconfiguration, not an excuse to accept unverified requests.
  if (!env.whatsapp.metaAppSecret) {
    logger.error("whatsapp_webhook_not_configured", { missing: "WHATSAPP_META_APP_SECRET" });
    return sendError(res, 500, "WEBHOOK_NOT_CONFIGURED", "WhatsApp webhook verification is not configured.");
  }

  const computed =
    "sha256=" + crypto.createHmac("sha256", env.whatsapp.metaAppSecret).update(rawBody).digest("hex");
  if (!signature || !safeEqual(signature, computed)) {
    logger.error("whatsapp_webhook_invalid_signature", { hasSignature: Boolean(signature) });
    return sendError(res, 401, "INVALID_SIGNATURE", "Webhook signature verification failed.");
  }

  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    logger.error("whatsapp_webhook_malformed_payload", {});
    return sendError(res, 400, "MALFORMED_PAYLOAD", "Webhook payload was not valid JSON.");
  }

  const { messages, statuses } = parseWhatsAppWebhookPayload(payload);
  logger.info("whatsapp_webhook_verified", { messageCount: messages.length, statusCount: statuses.length });

  // Vercel serverless functions can stop executing shortly after the response
  // is sent — there's no background worker here to finish the job — so
  // processing is awaited before acknowledging rather than fired-and-forgotten
  // after responding. Per-item failures are caught and logged individually so
  // one bad item can't take the whole batch down or block the 200.
  for (const message of messages) {
    try {
      await processInboundMessage(message);
    } catch (err) {
      logger.error("Failed to process WhatsApp inbound message", {
        messageId: message.id,
        message: (err as Error).message,
      });
    }
  }

  for (const status of statuses) {
    try {
      await processStatusUpdate(status);
    } catch (err) {
      logger.error("Failed to process WhatsApp status update", {
        statusMessageId: status.id,
        message: (err as Error).message,
      });
    }
  }

  sendSuccess(res, { messages: messages.length, statuses: statuses.length });
  return;
}

async function processInboundMessage(message: MetaMessage): Promise<void> {
  if (!message.id) return;

  const isNewDelivery = await claimWebhookEvent("whatsapp", message.id);
  if (!isNewDelivery) return;

  try {
    const buttonReply = message.interactive?.button_reply;
    if (buttonReply) {
      await processButtonReply(buttonReply, message.id);
    } else if (message.type === "text") {
      // V1 is a button-only confirmation flow — free-text replies aren't tied to
      // an order, so they're just logged for visibility, not acted on.
      logger.info("WhatsApp webhook: received text message", {
        from: message.from ? maskPhone(message.from) : undefined,
        messageId: message.id,
      });
    } else {
      logger.info("WhatsApp webhook: received unhandled message type", {
        type: message.type ?? "unknown",
        messageId: message.id,
      });
    }
    await completeWebhookEvent("whatsapp", message.id);
  } catch (err) {
    // Leaves the event retryable rather than permanently claimed — see
    // webhook-event.model.ts for why claim-before-process must not be terminal.
    await failWebhookEvent("whatsapp", message.id);
    throw err;
  }
}

async function processButtonReply(buttonReply: MetaButtonReply, providerMessageId: string): Promise<void> {
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

async function processStatusUpdate(status: MetaStatus): Promise<void> {
  if (!status.id || !status.status) return;

  logger.info("whatsapp_message_status_received", {
    providerMessageId: status.id,
    status: status.status,
    recipientMasked: status.recipient_id ? maskPhone(status.recipient_id) : undefined,
    timestamp: status.timestamp,
  });

  if (!VALID_STATUS_VALUES.has(status.status)) {
    logger.info("whatsapp_message_status_ignored", { providerMessageId: status.id, status: status.status });
    return;
  }

  const idempotencyKey = `${status.id}:${status.status}`;
  const isNewDelivery = await claimWebhookEvent("whatsapp", idempotencyKey);
  if (!isNewDelivery) return;

  try {
    const firstError = status.status === "failed" ? status.errors?.[0] : undefined;
    const metadata = status.errors?.length ? { errors: status.errors } : undefined;

    const updated = await updateCommunicationStatusByProviderMessageId(
      status.id,
      status.status as CommunicationDocument["status"],
      metadata
    );

    if (!updated) {
      // Not an error — this instance may not have the outbound record (e.g. sent
      // via a different Akedly deployment/account), or it's for a message we
      // sent outside the confirmation flow.
      logger.info("whatsapp_message_status_unmatched", { providerMessageId: status.id, status: status.status });
    } else if (status.status === "failed") {
      logger.error("whatsapp_message_status_failed", {
        providerMessageId: status.id,
        orderId: String(updated.orderId),
        merchantId: String(updated.merchantId),
        errorCode: firstError?.code,
        errorMessage: firstError?.title,
      });
    } else {
      logger.info("whatsapp_message_status_updated", {
        providerMessageId: status.id,
        orderId: String(updated.orderId),
        merchantId: String(updated.merchantId),
        status: status.status,
      });
    }
    await completeWebhookEvent("whatsapp", idempotencyKey);
  } catch (err) {
    await failWebhookEvent("whatsapp", idempotencyKey);
    throw err;
  }
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
  await processInboundMessage({
    id: `sim_${crypto.randomUUID()}`,
    type: "interactive",
    interactive: { button_reply: { id: `${input.action}:${input.orderId}` } },
  });

  const order = await OrderModel.findById(input.orderId);
  sendSuccess(res, { order });
});
