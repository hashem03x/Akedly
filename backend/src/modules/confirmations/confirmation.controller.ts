import { asyncHandler } from "../../middleware/error.middleware";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { sendSuccess } from "../../utils/api-response";
import { ApiError } from "../../utils/api-error";
import { toOrderDto } from "../orders/order.dto";
import { getOwnedOrder } from "../orders/order.service";
import { getOwnedStore } from "../stores/store.service";
import * as confirmationService from "./confirmation.service";

export const resendConfirmation = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const order = await getOwnedOrder(req.merchantId!, req.params.orderId);
  if (order.confirmationStatus !== "pending") {
    throw ApiError.conflict(
      "ORDER_NOT_PENDING",
      "Only pending orders can receive a new confirmation message."
    );
  }
  const store = await getOwnedStore(req.merchantId!, String(order.storeId));
  const updated = await confirmationService.sendConfirmationForOrder(order, store);
  sendSuccess(res, { order: toOrderDto(updated) });
});

export const confirmOrderManually = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const order = await getOwnedOrder(req.merchantId!, req.params.orderId);
  const updated = await confirmationService.confirmOrder(order.id, { channel: "system" });
  sendSuccess(res, { order: toOrderDto(updated) });
});

export const cancelOrderManually = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const order = await getOwnedOrder(req.merchantId!, req.params.orderId);
  const updated = await confirmationService.cancelOrder(order.id, { channel: "system" });
  sendSuccess(res, { order: toOrderDto(updated) });
});
