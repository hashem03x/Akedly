import type { OrderDocument } from "./order.model";
import type { CommunicationDocument } from "../communications/communication.model";

export function toOrderDto(order: OrderDocument) {
  return {
    id: order.id,
    storeId: String(order.storeId),
    externalOrderId: order.externalOrderId,
    orderNumber: order.orderNumber,
    customer: order.customer,
    items: order.items,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    currency: order.currency,
    platform: order.platform,
    confirmationStatus: order.confirmationStatus,
    confirmationChannel: order.confirmationChannel,
    confirmedAt: order.confirmedAt,
    cancelledAt: order.cancelledAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export function toCommunicationDto(event: CommunicationDocument) {
  return {
    id: event.id,
    channel: event.channel,
    direction: event.direction,
    type: event.type,
    status: event.status,
    providerMessageId: event.providerMessageId,
    metadata: event.metadata,
    createdAt: event.createdAt,
  };
}
