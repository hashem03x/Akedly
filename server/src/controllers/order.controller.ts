import type { Request, Response } from "express";
import { ConfirmationService } from "../services/confirmation.service";
import { OrderService } from "../services/order.service";
import { sendSuccess } from "../utils/api-response";
import { AppError } from "../utils/app-error";
import { listOrdersQuerySchema } from "../validation/order.schema";

function requireMerchantId(req: Request): string {
  if (!req.merchantId) throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  return req.merchantId;
}

async function list(req: Request, res: Response): Promise<void> {
  const merchantId = requireMerchantId(req);

  const parsed = listOrdersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => `${issue.path.join(".") || "query"}: ${issue.message}`).join("; ");
    throw new AppError(400, "VALIDATION_ERROR", message);
  }

  const { status, confirmationMethod, from, to, page, limit } = parsed.data;
  const result = await OrderService.listOrders(merchantId, { status, confirmationMethod, from, to, page, limit });
  sendSuccess(res, result);
}

async function getById(req: Request, res: Response): Promise<void> {
  const merchantId = requireMerchantId(req);
  const order = await OrderService.getOrderForMerchant(merchantId, req.params.id as string);
  sendSuccess(res, { order });
}

async function confirm(req: Request, res: Response): Promise<void> {
  const merchantId = requireMerchantId(req);
  await OrderService.getOrderForMerchant(merchantId, req.params.id as string); // enforces tenant isolation
  const order = await ConfirmationService.confirmOrder(req.params.id as string, "MANUAL");
  sendSuccess(res, { order });
}

async function cancel(req: Request, res: Response): Promise<void> {
  const merchantId = requireMerchantId(req);
  await OrderService.getOrderForMerchant(merchantId, req.params.id as string);
  const order = await ConfirmationService.cancelOrder(req.params.id as string, "MANUAL");
  sendSuccess(res, { order });
}

async function retryConfirmation(req: Request, res: Response): Promise<void> {
  const merchantId = requireMerchantId(req);
  const order = await OrderService.getOrderForMerchant(merchantId, req.params.id as string);
  if (order.status !== "PENDING_CONFIRMATION") {
    throw new AppError(409, "INVALID_ORDER_TRANSITION", "Only orders pending confirmation can be retried");
  }
  await ConfirmationService.retryConfirmation(order.id as string);
  sendSuccess(res, { triggered: true });
}

async function communications(req: Request, res: Response): Promise<void> {
  const merchantId = requireMerchantId(req);
  const timeline = await OrderService.getCommunicationTimeline(merchantId, req.params.id as string);
  sendSuccess(res, timeline);
}

export const OrderController = { list, getById, confirm, cancel, retryConfirmation, communications };
