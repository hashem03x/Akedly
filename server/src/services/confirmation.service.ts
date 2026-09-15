import { jobQueue } from "../jobs";
import { ConfirmationAttempt } from "../models/confirmation-attempt.model";
import { Customer } from "../models/customer.model";
import { Merchant, type MerchantDocument } from "../models/merchant.model";
import { Order, type OrderDocument } from "../models/order.model";
import type { ConfirmationMethod, ConfirmationResult, OrderStatus } from "../types/enums";
import { AppError } from "../utils/app-error";
import { logger } from "../utils/logger";
import { VoiceService } from "./voice.service";
import { WhatsAppService } from "./whatsapp.service";

// The only state transitions this service will ever apply. Anything not
// listed here (e.g. CONFIRMED -> CANCELLED, from a stale/duplicate
// webhook) is rejected rather than silently applied.
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_CONFIRMATION: ["CONFIRMED", "CANCELLED", "EXPIRED"],
  CONFIRMED: [],
  CANCELLED: [],
  EXPIRED: [],
};

function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new AppError(409, "INVALID_ORDER_TRANSITION", `Cannot transition order from ${from} to ${to}`);
  }
}

async function completeOpenAttempt(order: OrderDocument, result: ConfirmationResult): Promise<void> {
  const attempt = await ConfirmationAttempt.findOne({ orderId: order._id, status: "PENDING" }).sort({
    attemptNumber: -1,
  });
  if (!attempt) return;
  attempt.status = "COMPLETED";
  attempt.result = result;
  attempt.completedAt = new Date();
  await attempt.save();
}

async function bumpCustomerStat(customerId: unknown, field: "confirmedOrders" | "cancelledOrders"): Promise<void> {
  await Customer.updateOne({ _id: customerId }, { $inc: { [`statistics.${field}`]: 1 } });
}

async function requireOrder(orderId: string): Promise<OrderDocument> {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
  return order;
}

/**
 * Kicks off the confirmation workflow for a freshly created order: the
 * first WhatsApp attempt, plus scheduling the voice fallback in case the
 * customer never responds. Called once, right after OrderService creates
 * the order.
 */
async function startConfirmation(orderId: string): Promise<void> {
  const order = await requireOrder(orderId);
  const merchant = await Merchant.findById(order.merchantId);
  if (!merchant) throw new AppError(404, "MERCHANT_NOT_FOUND", "Merchant not found");

  if (!merchant.settings.confirmationEnabled || !merchant.settings.whatsappEnabled) {
    logger.info("CONFIRMATION", `Confirmation/WhatsApp disabled for merchant ${merchant.id} — skipping order ${orderId}`);
    return;
  }

  await recordAttempt(order, merchant, "WHATSAPP", async () => {
    const result = await WhatsAppService.sendConfirmationMessage(order, merchant.name);
    return result.externalId;
  });

  scheduleVoiceFallback(order.id as string, merchant);
}

function scheduleVoiceFallback(orderId: string, merchant: MerchantDocument): void {
  if (!merchant.settings.voiceFallbackEnabled) return;

  const delayMs = merchant.settings.voiceFallbackDelayMinutes * 60 * 1000;
  jobQueue.schedule(delayMs, () => retryConfirmation(orderId));
}

/**
 * Fired by the voice-fallback job (or manually via the retry-confirmation
 * API). No-ops if the order already resolved itself in the meantime.
 */
async function retryConfirmation(orderId: string): Promise<void> {
  const order = await Order.findById(orderId);
  if (!order || order.status !== "PENDING_CONFIRMATION") return;

  const merchant = await Merchant.findById(order.merchantId);
  if (!merchant || !merchant.settings.voiceFallbackEnabled) return;

  if (order.confirmation.attempts >= merchant.settings.maxConfirmationAttempts) {
    logger.info("CONFIRMATION", `Order ${orderId} reached max confirmation attempts (${merchant.settings.maxConfirmationAttempts}) — expiring`);
    await expireOrder(orderId);
    return;
  }

  await recordAttempt(order, merchant, "VOICE", async () => {
    const result = await VoiceService.startConfirmationCall(order);
    return result.externalId;
  });
}

async function recordAttempt(
  order: OrderDocument,
  merchant: MerchantDocument,
  channel: "WHATSAPP" | "VOICE",
  send: () => Promise<string>,
): Promise<void> {
  const attemptNumber = order.confirmation.attempts + 1;

  const attempt = await ConfirmationAttempt.create({
    merchantId: order.merchantId,
    orderId: order._id,
    customerId: order.customerId,
    channel,
    attemptNumber,
    provider: channel === "WHATSAPP" ? "META" : merchant.settings.voiceFallbackEnabled ? "TWILIO" : "UNKNOWN",
    startedAt: new Date(),
  });

  order.confirmation.attempts = attemptNumber;
  order.confirmation.lastAttemptAt = new Date();
  await order.save();

  try {
    attempt.externalId = await send();
    await attempt.save();
  } catch (error) {
    attempt.status = "FAILED";
    attempt.completedAt = new Date();
    await attempt.save();
    logger.error("CONFIRMATION", `Failed to send ${channel} confirmation attempt`, {
      orderId: order.id,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function confirmOrder(orderId: string, method: ConfirmationMethod): Promise<OrderDocument> {
  const order = await requireOrder(orderId);

  if (order.status === "CONFIRMED") {
    logger.info("CONFIRMATION", `Order ${orderId} already CONFIRMED — ignoring duplicate confirm from ${method}`);
    return order;
  }
  assertTransition(order.status, "CONFIRMED");

  order.status = "CONFIRMED";
  order.confirmation.status = "CONFIRMED";
  order.confirmation.method = method;
  order.confirmation.confirmedAt = new Date();
  await order.save();

  await completeOpenAttempt(order, "CONFIRMED");
  await bumpCustomerStat(order.customerId, "confirmedOrders");

  logger.info("ORDER", `Order ${orderId} confirmed via ${method}`);
  return order;
}

async function cancelOrder(orderId: string, method: ConfirmationMethod): Promise<OrderDocument> {
  const order = await requireOrder(orderId);

  if (order.status === "CANCELLED") {
    logger.info("CONFIRMATION", `Order ${orderId} already CANCELLED — ignoring duplicate cancel from ${method}`);
    return order;
  }
  assertTransition(order.status, "CANCELLED");

  order.status = "CANCELLED";
  order.confirmation.status = "CANCELLED";
  order.confirmation.method = method;
  order.confirmation.cancelledAt = new Date();
  await order.save();

  await completeOpenAttempt(order, "CANCELLED");
  await bumpCustomerStat(order.customerId, "cancelledOrders");

  logger.info("ORDER", `Order ${orderId} cancelled via ${method}`);
  return order;
}

async function expireOrder(orderId: string): Promise<OrderDocument> {
  const order = await requireOrder(orderId);
  if (order.status !== "PENDING_CONFIRMATION") return order;

  assertTransition(order.status, "EXPIRED");
  order.status = "EXPIRED";
  order.confirmation.status = "EXPIRED";
  await order.save();

  await completeOpenAttempt(order, "NO_RESPONSE");
  logger.info("ORDER", `Order ${orderId} expired after exhausting confirmation attempts`);
  return order;
}

export const ConfirmationService = {
  startConfirmation,
  retryConfirmation,
  confirmOrder,
  cancelOrder,
  expireOrder,
};
