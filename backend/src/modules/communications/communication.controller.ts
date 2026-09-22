import { asyncHandler } from "../../middleware/error.middleware";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { sendSuccess } from "../../utils/api-response";
import { CommunicationModel } from "./communication.model";
import { OrderModel } from "../orders/order.model";

export const listActivity = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const limit = Math.min(100, Number(req.query.limit ?? 50));

  const events = await CommunicationModel.find({ merchantId: req.merchantId })
    .sort({ createdAt: -1 })
    .limit(limit);

  const orderIds = [...new Set(events.map((e) => String(e.orderId)))];
  const orders = await OrderModel.find({ _id: { $in: orderIds } }).select("orderNumber customer.name");
  const orderById = new Map(orders.map((o) => [o.id, o]));

  sendSuccess(res, {
    activity: events.map((event) => {
      const order = orderById.get(String(event.orderId));
      return {
        id: event.id,
        orderId: String(event.orderId),
        orderNumber: order?.orderNumber ?? null,
        customerName: order?.customer?.name ?? null,
        channel: event.channel,
        direction: event.direction,
        type: event.type,
        status: event.status,
        createdAt: event.createdAt,
      };
    }),
  });
});
