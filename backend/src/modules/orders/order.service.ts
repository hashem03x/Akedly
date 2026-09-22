import { ApiError } from "../../utils/api-error";
import type { StoreDocument } from "../stores/store.model";
import { recordCommunication } from "../communications/communication.service";
import { OrderModel, type OrderDocument, CONFIRMATION_STATUSES } from "./order.model";
import type { NormalizedOrderInput } from "./order.types";

export interface OrderListFilters {
  status?: (typeof CONFIRMATION_STATUSES)[number];
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Persists a normalized order for a store. Returns { order, created: false } when the
 * order already exists (duplicate webhook delivery) instead of throwing, so callers can
 * treat webhook retries as a no-op rather than an error.
 */
export async function ingestOrder(
  store: StoreDocument,
  normalized: NormalizedOrderInput
): Promise<{ order: OrderDocument; created: boolean }> {
  const existing = await OrderModel.findOne({
    storeId: store._id,
    externalOrderId: normalized.externalOrderId,
  });
  if (existing) {
    return { order: existing, created: false };
  }

  try {
    const order = await OrderModel.create({
      merchantId: store.merchantId,
      storeId: store._id,
      externalOrderId: normalized.externalOrderId,
      orderNumber: normalized.orderNumber,
      customer: normalized.customer,
      items: normalized.items,
      subtotal: normalized.subtotal,
      shipping: normalized.shipping,
      total: normalized.total,
      currency: normalized.currency,
      platform: store.platform,
      confirmationStatus: "pending",
    });

    await recordCommunication({
      merchantId: String(store.merchantId),
      orderId: order.id,
      channel: "system",
      direction: "outbound",
      type: "order_received",
      status: "sent",
      metadata: { orderNumber: order.orderNumber },
    });

    return { order, created: true };
  } catch (err: unknown) {
    // Race: two concurrent deliveries both passed the findOne check above.
    if ((err as { code?: number }).code === 11000) {
      const raced = await OrderModel.findOne({
        storeId: store._id,
        externalOrderId: normalized.externalOrderId,
      });
      if (raced) return { order: raced, created: false };
    }
    throw err;
  }
}

export async function listOrdersForMerchant(merchantId: string, filters: OrderListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));

  const query: Record<string, unknown> = { merchantId };
  if (filters.status) query.confirmationStatus = filters.status;
  if (filters.search) {
    const regex = new RegExp(escapeRegExp(filters.search), "i");
    query.$or = [{ orderNumber: regex }, { "customer.name": regex }, { "customer.phone": regex }];
  }

  const [orders, total] = await Promise.all([
    OrderModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    OrderModel.countDocuments(query),
  ]);

  return { orders, total, page, pageSize };
}

export async function getOwnedOrder(merchantId: string, orderId: string): Promise<OrderDocument> {
  const order = await OrderModel.findOne({ _id: orderId, merchantId });
  if (!order) {
    throw ApiError.notFound("Order not found.", "ORDER_NOT_FOUND");
  }
  return order;
}

export async function getOverviewMetrics(merchantId: string) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [ordersToday, pending, confirmed, cancelled, totalDecided] = await Promise.all([
    OrderModel.countDocuments({ merchantId, createdAt: { $gte: startOfToday } }),
    OrderModel.countDocuments({ merchantId, confirmationStatus: "pending" }),
    OrderModel.countDocuments({ merchantId, confirmationStatus: "confirmed" }),
    OrderModel.countDocuments({ merchantId, confirmationStatus: "cancelled" }),
    OrderModel.countDocuments({
      merchantId,
      confirmationStatus: { $in: ["confirmed", "cancelled"] },
    }),
  ]);

  const confirmationRate = totalDecided === 0 ? 0 : Math.round((confirmed / totalDecided) * 100);

  return { ordersToday, pending, confirmed, cancelled, confirmationRate };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
