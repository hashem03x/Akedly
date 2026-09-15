import type { Request, Response } from "express";
import { ConfirmationService } from "../services/confirmation.service";
import { OrderService } from "../services/order.service";
import { sendSuccess } from "../utils/api-response";
import { AppError } from "../utils/app-error";

async function triggerCall(req: Request, res: Response): Promise<void> {
  if (!req.merchantId) throw new AppError(401, "UNAUTHORIZED", "Authentication required");

  const order = await OrderService.getOrderForMerchant(req.merchantId, req.params.orderId as string);
  if (order.status !== "PENDING_CONFIRMATION") {
    throw new AppError(409, "INVALID_ORDER_TRANSITION", "Only orders pending confirmation can receive a voice call");
  }

  await ConfirmationService.retryConfirmation(order.id as string);
  sendSuccess(res, { triggered: true });
}

export const VoiceController = { triggerCall };
