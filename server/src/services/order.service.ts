import type { MappedShopifyOrder } from "../integrations/shopify/shopify-order-payload";
import { Call, type CallDocument } from "../models/call.model";
import { Communication, type CommunicationDocument } from "../models/communication.model";
import { ConfirmationAttempt, type ConfirmationAttemptDocument } from "../models/confirmation-attempt.model";
import { Customer, type CustomerDocument } from "../models/customer.model";
import { Order, type OrderDocument } from "../models/order.model";
import type { ConfirmationMethod, OrderStatus } from "../types/enums";
import { AppError } from "../utils/app-error";
import { logger } from "../utils/logger";
import { isDuplicateKeyError } from "../utils/mongo-errors";
import { ConfirmationService } from "./confirmation.service";

async function findOrCreateCustomer(
  merchantId: string,
  input: { name: string; phone: string; email?: string },
): Promise<CustomerDocument> {
  const customer = await Customer.findOneAndUpdate(
    { merchantId, phone: input.phone },
    { $setOnInsert: { name: input.name, email: input.email } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  return customer;
}

/**
 * Creates the Order (and its Customer, if needed) from a mapped Shopify
 * payload and kicks off the confirmation workflow. Returns null — without
 * throwing — for the two cases that are not errors: the order has already
 * been processed (duplicate webhook delivery) or it has no phone number
 * to confirm against.
 */
async function createOrderFromShopify(merchantId: string, mapped: MappedShopifyOrder): Promise<OrderDocument | null> {
  if (!mapped.customerPhone) {
    logger.warn(
      "ORDER",
      `Shopify order ${mapped.shopifyOrderId} has no phone number on the order or customer — skipping (WhatsApp/voice confirmation both require one)`,
      { merchantId },
    );
    return null;
  }

  const customer = await findOrCreateCustomer(merchantId, {
    name: mapped.customerName,
    phone: mapped.customerPhone,
    email: mapped.customerEmail,
  });

  let order: OrderDocument;
  try {
    order = await Order.create({
      merchantId,
      customerId: customer._id,
      shopifyOrderId: mapped.shopifyOrderId,
      shopifyOrderNumber: mapped.shopifyOrderNumber,
      customer: { name: mapped.customerName, phone: mapped.customerPhone, email: mapped.customerEmail },
      items: mapped.items,
      subtotal: mapped.subtotal,
      shipping: mapped.shipping,
      discount: mapped.discount,
      total: mapped.total,
      currency: mapped.currency,
    });
  } catch (error) {
    // Belt-and-suspenders against a race with the merchantId+shopifyOrderId
    // unique index — the index is the real idempotency guarantee.
    if (isDuplicateKeyError(error)) {
      logger.info(
        "ORDER",
        `Shopify order ${mapped.shopifyOrderId} already exists for merchant ${merchantId} — ignoring duplicate webhook`,
      );
      return null;
    }
    throw error;
  }

  await Customer.updateOne({ _id: customer._id }, { $inc: { "statistics.totalOrders": 1 } });
  await ConfirmationService.startConfirmation(order.id as string);

  return order;
}

async function getOrderForMerchant(merchantId: string, orderId: string): Promise<OrderDocument> {
  const order = await Order.findOne({ _id: orderId, merchantId });
  if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Order not found");
  return order;
}

export interface ListOrdersFilters {
  status?: OrderStatus;
  confirmationMethod?: ConfirmationMethod;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}

export interface ListOrdersResult {
  orders: OrderDocument[];
  total: number;
  page: number;
  limit: number;
}

async function listOrders(merchantId: string, filters: ListOrdersFilters): Promise<ListOrdersResult> {
  const query: Record<string, unknown> = { merchantId };
  if (filters.status) query.status = filters.status;
  if (filters.confirmationMethod) query["confirmation.method"] = filters.confirmationMethod;
  if (filters.from || filters.to) {
    const createdAt: Record<string, Date> = {};
    if (filters.from) createdAt.$gte = filters.from;
    if (filters.to) createdAt.$lte = filters.to;
    query.createdAt = createdAt;
  }

  const skip = (filters.page - 1) * filters.limit;
  const [orders, total] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(filters.limit),
    Order.countDocuments(query),
  ]);

  return { orders, total, page: filters.page, limit: filters.limit };
}

export interface OrderTimeline {
  communications: CommunicationDocument[];
  calls: CallDocument[];
  attempts: ConfirmationAttemptDocument[];
}

async function getCommunicationTimeline(merchantId: string, orderId: string): Promise<OrderTimeline> {
  await getOrderForMerchant(merchantId, orderId); // enforces tenant isolation, 404s if not owned

  const [communications, calls, attempts] = await Promise.all([
    Communication.find({ orderId }).sort({ createdAt: 1 }),
    Call.find({ orderId }).sort({ createdAt: 1 }),
    ConfirmationAttempt.find({ orderId }).sort({ attemptNumber: 1 }),
  ]);

  return { communications, calls, attempts };
}

export const OrderService = {
  findOrCreateCustomer,
  createOrderFromShopify,
  getOrderForMerchant,
  listOrders,
  getCommunicationTimeline,
};
