import { asyncHandler } from "../../middleware/error.middleware";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { sendSuccess } from "../../utils/api-response";
import { listCommunicationsForOrder } from "../communications/communication.service";
import { toCommunicationDto, toOrderDto } from "./order.dto";
import * as orderService from "./order.service";
import { listOrdersQuerySchema } from "./order.validation";

export const listOrders = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = listOrdersQuerySchema.parse(req.query);
  const { orders, total, page, pageSize } = await orderService.listOrdersForMerchant(
    req.merchantId!,
    query
  );
  sendSuccess(res, {
    orders: orders.map(toOrderDto),
    pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
});

export const getOrder = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const order = await orderService.getOwnedOrder(req.merchantId!, req.params.orderId);
  const communications = await listCommunicationsForOrder(order.id);
  sendSuccess(res, {
    order: toOrderDto(order),
    timeline: communications.map(toCommunicationDto),
  });
});

export const getOverview = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const metrics = await orderService.getOverviewMetrics(req.merchantId!);
  sendSuccess(res, { metrics });
});
