import { ApiError } from "../../utils/api-error";
import { logger } from "../../utils/logger";
import { getStoreProvider } from "../../integrations/store-providers";
import { getWhatsAppProvider } from "../../integrations/confirmation-providers";
import { recordCommunication } from "../communications/communication.service";
import { StoreModel, type StoreDocument, type StorePlatform } from "../stores/store.model";
import { buildStoreConnectionInput } from "../stores/store.service";
import { OrderModel, type OrderDocument, type ConfirmationStatus } from "../orders/order.model";

const ALLOWED_TRANSITIONS: Record<ConfirmationStatus, ConfirmationStatus[]> = {
  pending: ["confirmed", "cancelled", "expired", "awaiting_cancellation_reason"],
  // Customer tapped cancel and is being asked why; still reversible (they can
  // tap confirm instead) or can time out like any other pending order.
  awaiting_cancellation_reason: ["cancelled", "confirmed", "expired"],
  confirmed: [],
  cancelled: [],
  expired: [],
};

export function canTransition(from: ConfirmationStatus, to: ConfirmationStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

function assertValidTransition(from: ConfirmationStatus, to: ConfirmationStatus): void {
  if (from === to) return; // idempotent no-op, handled by callers
  if (!canTransition(from, to)) {
    throw ApiError.conflict(
      "INVALID_TRANSITION",
      `Cannot move an order from "${from}" to "${to}".`
    );
  }
}

/** Sends the WhatsApp order-confirmation message and records the outbound event. */
export async function sendConfirmationForOrder(
  order: OrderDocument,
  store: StoreDocument
): Promise<OrderDocument> {
  const provider = getWhatsAppProvider();
  const language = store.settings?.messageLanguage ?? "ar";

  const result = await provider.sendOrderConfirmation({
    orderId: order.id,
    toPhone: order.customer.phone,
    language,
    customerName: order.customer.name,
    storeName: store.name,
    orderNumber: order.orderNumber,
    items: order.items.map((i) => ({ name: i.name, quantity: i.quantity })),
    total: order.total,
    currency: order.currency,
  });

  // type distinguishes success/failure (not just `status`) because the dashboard
  // timeline (frontend/src/components/orders/Timeline.tsx) keys its label off
  // `type` alone for this event — recording every attempt as "confirmation_sent"
  // regardless of outcome silently told merchants a failed send had succeeded.
  //
  // status is "accepted", not "sent", on success: an HTTP 200 from Meta's Graph
  // API only means the request was accepted for processing, not that WhatsApp
  // actually delivered (or even sent) it — see communication.model.ts. This
  // record is upgraded to "sent"/"delivered"/"read"/"failed" later by
  // updateCommunicationStatusByProviderMessageId when (if) Meta's own status
  // webhook arrives — see webhooks/whatsapp.webhook.ts's processStatusUpdate.
  await recordCommunication({
    merchantId: String(order.merchantId),
    orderId: order.id,
    channel: "whatsapp",
    direction: "outbound",
    type: result.success ? "confirmation_sent" : "confirmation_failed",
    status: result.success ? "accepted" : "failed",
    providerMessageId: result.providerMessageId,
    metadata: result.success ? undefined : { error: result.error },
  });

  if (result.success) {
    order.confirmationChannel = "whatsapp";
    await order.save();
    logger.info("communication_created", { orderId: order.id, type: "confirmation_sent" });
  } else {
    logger.warn("whatsapp_confirmation_send_failed", { orderId: order.id, error: result.error });
  }

  return order;
}

async function syncOrderToStore(order: OrderDocument, status: "confirmed" | "cancelled"): Promise<void> {
  const store = await StoreModel.findOne({ _id: order.storeId }).select(
    "+credentials.accessToken +credentials.refreshToken +credentials.consumerKey +credentials.consumerSecret"
  );
  if (!store) return;

  const provider = getStoreProvider(store.platform as StorePlatform);

  try {
    // Resolves a valid (refreshed if necessary) Shopify token, or decrypts
    // WooCommerce's static keys — never reads a possibly-stale token directly.
    const input = await buildStoreConnectionInput(store);
    await provider.syncOrderStatus(input, { externalOrderId: order.externalOrderId, status });
    await recordCommunication({
      merchantId: String(order.merchantId),
      orderId: order.id,
      channel: "system",
      direction: "outbound",
      type: "store_synced",
      status: "sent",
    });
  } catch (err) {
    logger.warn("Store sync failed", { orderId: order.id, message: (err as Error).message });
    await recordCommunication({
      merchantId: String(order.merchantId),
      orderId: order.id,
      channel: "system",
      direction: "outbound",
      type: "store_synced",
      status: "failed",
      metadata: { error: (err as Error).message },
    });
  }
}

interface TransitionContext {
  channel: "whatsapp" | "phone" | "system";
  providerMessageId?: string;
}

async function transitionOrder(
  orderId: string,
  target: "confirmed" | "cancelled" | "expired",
  ctx: TransitionContext
): Promise<OrderDocument> {
  const order = await OrderModel.findById(orderId);
  if (!order) {
    throw ApiError.notFound("Order not found.", "ORDER_NOT_FOUND");
  }

  // Idempotent no-op: same terminal state reached twice (e.g. double-click, duplicate webhook).
  if (order.confirmationStatus === target) {
    return order;
  }

  assertValidTransition(order.confirmationStatus as ConfirmationStatus, target);

  order.confirmationStatus = target;
  if (target === "confirmed") order.confirmedAt = new Date();
  if (target === "cancelled") order.cancelledAt = new Date();
  await order.save();

  if (target === "confirmed" || target === "cancelled") {
    await syncOrderToStore(order, target);
  }

  return order;
}

export async function confirmOrder(orderId: string, ctx: TransitionContext): Promise<OrderDocument> {
  return transitionOrder(orderId, "confirmed", ctx);
}

/**
 * Immediate cancellation — no reason prompt. Used by the merchant's own
 * dashboard "cancel order" action (confirmation.controller.ts), which is a
 * merchant decision, not a customer reply, so it must not be routed through
 * the WhatsApp reason-collection flow below.
 */
export async function cancelOrder(orderId: string, ctx: TransitionContext): Promise<OrderDocument> {
  return transitionOrder(orderId, "cancelled", ctx);
}

export async function expireOrder(orderId: string): Promise<OrderDocument> {
  return transitionOrder(orderId, "expired", { channel: "system" });
}

/**
 * Customer tapped "إلغاء الطلب" (cancel_order). Doesn't cancel the order yet —
 * moves it to awaiting_cancellation_reason and asks the customer why, via a
 * plain text message. That's a freeform (non-template) send, which is only
 * allowed within an open 24h session — valid here because the customer just
 * messaged us (tapping the button opens the window).
 *
 * Idempotent by design, not just by accident: if the order is already
 * awaiting_cancellation_reason (double-tap, retried webhook that got past
 * dedup some other way), this returns early WITHOUT re-sending the prompt —
 * required by the "must not send duplicate cancellation prompts" invariant.
 */
export async function startCancellationReasonCollection(
  orderId: string,
  ctx: TransitionContext
): Promise<OrderDocument> {
  const order = await OrderModel.findById(orderId);
  if (!order) {
    throw ApiError.notFound("Order not found.", "ORDER_NOT_FOUND");
  }

  if (order.confirmationStatus === "awaiting_cancellation_reason" || order.confirmationStatus === "cancelled") {
    return order;
  }

  assertValidTransition(order.confirmationStatus as ConfirmationStatus, "awaiting_cancellation_reason");
  order.confirmationStatus = "awaiting_cancellation_reason";
  await order.save();

  const store = await StoreModel.findById(order.storeId);
  const language = store?.settings?.messageLanguage ?? "ar";
  const promptText =
    language === "ar"
      ? "تمام، ممكن تقولنا سبب إلغاء الطلب؟"
      : "Okay — could you tell us the reason for cancelling this order?";

  const provider = getWhatsAppProvider();
  const result = await provider.sendTextMessage(order.customer.phone, promptText);

  await recordCommunication({
    merchantId: String(order.merchantId),
    orderId: order.id,
    channel: "whatsapp",
    direction: "outbound",
    type: "cancellation_reason_requested",
    status: result.success ? "accepted" : "failed",
    providerMessageId: result.providerMessageId,
    metadata: result.success ? undefined : { error: result.error },
  });

  if (!result.success) {
    logger.warn("whatsapp_cancellation_reason_prompt_failed", { orderId: order.id, error: result.error });
  }

  return order;
}

/**
 * Customer's free-text reply while an order is awaiting_cancellation_reason.
 * Records the reason on the order, actually cancels it (reusing the same
 * transition/store-sync path as any other cancellation), and sends a short
 * closing acknowledgement — best-effort; the cancellation itself must not
 * fail just because the courtesy text couldn't be sent.
 */
export async function completeCancellationWithReason(
  orderId: string,
  reason: string,
  ctx: TransitionContext
): Promise<OrderDocument> {
  const order = await OrderModel.findById(orderId);
  if (!order) {
    throw ApiError.notFound("Order not found.", "ORDER_NOT_FOUND");
  }

  if (order.confirmationStatus === "cancelled") {
    return order;
  }

  assertValidTransition(order.confirmationStatus as ConfirmationStatus, "cancelled");
  order.cancellationReason = reason;
  order.confirmationStatus = "cancelled";
  order.cancelledAt = new Date();
  await order.save();

  await syncOrderToStore(order, "cancelled");

  const store = await StoreModel.findById(order.storeId);
  const language = store?.settings?.messageLanguage ?? "ar";
  const ackText =
    language === "ar" ? "تم إلغاء طلبك. شكراً لإخبارنا." : "Your order has been cancelled. Thank you for letting us know.";

  try {
    await getWhatsAppProvider().sendTextMessage(order.customer.phone, ackText);
  } catch (err) {
    logger.warn("whatsapp_cancellation_ack_failed", { orderId: order.id, message: (err as Error).message });
  }

  return order;
}
