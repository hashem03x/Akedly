import type { Request, Response } from "express";
import crypto from "crypto";
import { asyncHandler } from "../../middleware/error.middleware";
import { sendError, sendSuccess } from "../../utils/api-response";
import { logger } from "../../utils/logger";
import { decryptSecret } from "../../utils/crypto";
import { getStoreProvider } from "../../integrations/store-providers";
import { StoreModel } from "../stores/store.model";
import { ingestOrder } from "../orders/order.service";
import { sendConfirmationForOrder } from "../confirmations/confirmation.service";
import { claimWebhookEvent } from "./webhook-event.model";

export const handleWooCommerceWebhook = asyncHandler(async (req: Request, res: Response) => {
  const rawBody = req.body as Buffer;
  const sourceUrl = req.header("x-wc-webhook-source");

  if (!sourceUrl) {
    return sendError(res, 400, "MISSING_SOURCE", "Missing X-WC-Webhook-Source header.");
  }

  const domain = sourceUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const store = await StoreModel.findOne({ platform: "woocommerce", domain }).select(
    "+credentials.webhookSecret"
  );
  if (!store) {
    return sendError(res, 404, "STORE_NOT_FOUND", "No store is registered for this domain.");
  }
  if (!store.credentials?.webhookSecret) {
    return sendError(res, 500, "WEBHOOK_NOT_CONFIGURED", "Webhook secret missing for this store.");
  }

  const provider = getStoreProvider("woocommerce");
  const secret = decryptSecret(store.credentials.webhookSecret);
  if (!provider.verifyWebhookSignature(rawBody, req.headers, secret)) {
    return sendError(res, 401, "INVALID_SIGNATURE", "Webhook signature verification failed.");
  }

  const idempotencyKey =
    req.header("x-wc-webhook-delivery-id") ?? crypto.createHash("sha256").update(rawBody).digest("hex");
  const isNewDelivery = await claimWebhookEvent("woocommerce", idempotencyKey);
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
      logger.error("Failed to send confirmation after WooCommerce order ingest", {
        orderId: order.id,
        message: (err as Error).message,
      });
    }
  }
});
