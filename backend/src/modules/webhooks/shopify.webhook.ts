import type { Request, Response } from "express";
import crypto from "crypto";
import { env } from "../../config/env";
import { asyncHandler } from "../../middleware/error.middleware";
import { sendError, sendSuccess } from "../../utils/api-response";
import { logger } from "../../utils/logger";
import { getStoreProvider } from "../../integrations/store-providers";
import { StoreModel } from "../stores/store.model";
import { ingestOrder } from "../orders/order.service";
import { sendConfirmationForOrder } from "../confirmations/confirmation.service";
import { claimWebhookEvent } from "./webhook-event.model";

export const handleShopifyWebhook = asyncHandler(async (req: Request, res: Response) => {
  const rawBody = req.body as Buffer;
  const domain = req.header("x-shopify-shop-domain");
  const webhookId = req.header("x-shopify-webhook-id");

  if (!domain) {
    return sendError(res, 400, "MISSING_SHOP_DOMAIN", "Missing X-Shopify-Shop-Domain header.");
  }

  const provider = getStoreProvider("shopify");

  if (!env.shopify.clientSecret) {
    logger.error("SHOPIFY_CLIENT_SECRET is not configured; rejecting webhook.");
    return sendError(res, 500, "WEBHOOK_NOT_CONFIGURED", "Shopify webhook verification is not configured.");
  }

  if (!provider.verifyWebhookSignature(rawBody, req.headers, env.shopify.clientSecret)) {
    return sendError(res, 401, "INVALID_SIGNATURE", "Webhook signature verification failed.");
  }

  const store = await StoreModel.findOne({ platform: "shopify", domain: domain.toLowerCase() });
  if (!store) {
    return sendError(res, 404, "STORE_NOT_FOUND", "No store is registered for this shop domain.");
  }

  const idempotencyKey = webhookId ?? crypto.createHash("sha256").update(rawBody).digest("hex");
  const isNewDelivery = await claimWebhookEvent("shopify", idempotencyKey);
  if (!isNewDelivery) {
    return sendSuccess(res, { deduplicated: true });
  }

  const payload = JSON.parse(rawBody.toString("utf8"));
  const normalized = provider.normalizeOrder(payload);
  const { order, created } = await ingestOrder(store, normalized);

  sendSuccess(res, { orderId: order.id, created });

  if (created && store.settings?.autoConfirmationEnabled) {
    try {
      await sendConfirmationForOrder(order, store);
    } catch (err) {
      logger.error("Failed to send confirmation after Shopify order ingest", {
        orderId: order.id,
        message: (err as Error).message,
      });
    }
  }
});
