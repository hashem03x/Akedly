import type { Request, Response } from "express";
import { env } from "../config/env";
import { buildGreetingTwiml, buildOutcomeTwiml, buildRetryTwiml } from "../integrations/voice/twiml-builder";
import { verifyTwilioSignature } from "../integrations/voice/twilio-webhook-verify";
import { Call } from "../models/call.model";
import { Merchant } from "../models/merchant.model";
import { Order, type OrderDocument } from "../models/order.model";
import { ConfirmationService } from "../services/confirmation.service";
import { AppError } from "../utils/app-error";

function fullUrl(req: Request): string {
  return `${env.publicAppUrl ?? ""}${req.originalUrl}`;
}

function verifyRequest(req: Request): void {
  const signature = req.get("X-Twilio-Signature") ?? undefined;
  const params = req.body as Record<string, string>;
  if (!verifyTwilioSignature(fullUrl(req), params, signature)) {
    throw new AppError(401, "INVALID_WEBHOOK_SIGNATURE", "Twilio webhook signature verification failed");
  }
}

async function requireOrder(req: Request): Promise<OrderDocument> {
  const order = await Order.findById(req.params.orderId);
  if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
  return order;
}

async function twiml(req: Request, res: Response): Promise<void> {
  verifyRequest(req);
  const order = await requireOrder(req);
  const merchant = await Merchant.findById(order.merchantId);

  const xml = buildGreetingTwiml({
    storeName: merchant?.name ?? "your store",
    amountText: `${order.total} ${order.currency}`,
    gatherActionUrl: `${env.publicAppUrl}/api/v1/webhooks/voice/gather/${order.id as string}`,
  });

  res.type("text/xml").send(xml);
}

// One retry on invalid/no DTMF input, then give up — not a fully
// configurable retry count (see server/README.md's known-limitations
// note); this in-call retry is distinct from
// merchant.settings.maxConfirmationAttempts, which caps the number of
// separate confirmation *attempts* (WhatsApp/voice) per order.
async function gather(req: Request, res: Response): Promise<void> {
  verifyRequest(req);
  const order = await requireOrder(req);
  const digits = (req.body as Record<string, string>).Digits;

  if (digits === "1") {
    await ConfirmationService.confirmOrder(order.id as string, "VOICE");
    res.type("text/xml").send(buildOutcomeTwiml("Thank you. Your order has been confirmed. Goodbye."));
    return;
  }
  if (digits === "2") {
    await ConfirmationService.cancelOrder(order.id as string, "VOICE");
    res.type("text/xml").send(buildOutcomeTwiml("Your order has been cancelled. Goodbye."));
    return;
  }

  res.type("text/xml").send(
    buildRetryTwiml({ gatherActionUrl: `${env.publicAppUrl}/api/v1/webhooks/voice/gather/${order.id as string}` }),
  );
}

const TERMINAL_CALL_STATUSES = new Set(["completed", "busy", "failed", "no-answer", "canceled"]);
const NO_RESPONSE_STATUSES = new Set(["busy", "failed", "no-answer", "canceled"]);

async function status(req: Request, res: Response): Promise<void> {
  verifyRequest(req);
  await requireOrder(req);

  const body = req.body as Record<string, string>;
  const callStatus = body.CallStatus ?? "unknown";
  const callSid = body.CallSid;
  const duration = body.CallDuration ? Number(body.CallDuration) : undefined;

  const update: Record<string, unknown> = { status: callStatus };
  if (duration !== undefined) update.duration = duration;
  if (TERMINAL_CALL_STATUSES.has(callStatus)) update.completedAt = new Date();
  if (NO_RESPONSE_STATUSES.has(callStatus)) update.result = "NO_RESPONSE";

  if (callSid) {
    await Call.updateOne({ provider: env.voiceProvider, externalCallId: callSid }, update);
  }

  res.status(200).end();
}

export const VoiceWebhookController = { twiml, gather, status };
