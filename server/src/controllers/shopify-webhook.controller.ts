import type { Request, Response } from "express";
import { verifyShopifyWebhookHmac } from "../integrations/shopify/shopify-webhook-verify";
import { mapShopifyOrderPayload, type ShopifyOrderPayload } from "../integrations/shopify/shopify-order-payload";
import { Merchant } from "../models/merchant.model";
import { WebhookEvent } from "../models/webhook-event.model";
import { OrderService } from "../services/order.service";
import { sendSuccess } from "../utils/api-response";
import { AppError } from "../utils/app-error";
import { logger } from "../utils/logger";
import { isDuplicateKeyError } from "../utils/mongo-errors";

type OrderTopic = "orders/create" | "orders/updated";

async function handleOrderWebhook(req: Request, res: Response, topic: OrderTopic): Promise<void> {
  const hmacHeader = req.get("X-Shopify-Hmac-Sha256") ?? undefined;
  const shopDomain = req.get("X-Shopify-Shop-Domain");
  const webhookId = req.get("X-Shopify-Webhook-Id") ?? undefined;

  if (!verifyShopifyWebhookHmac(req.rawBody, hmacHeader)) {
    throw new AppError(401, "INVALID_WEBHOOK_SIGNATURE", "Shopify webhook HMAC verification failed");
  }
  if (!shopDomain) {
    throw new AppError(400, "MISSING_SHOP_DOMAIN", "Missing X-Shopify-Shop-Domain header");
  }

  const merchant = await Merchant.findOne({ "shopify.shopDomain": shopDomain });
  if (!merchant) {
    // Acknowledge with 200 anyway — Shopify would otherwise retry forever
    // for a shop we don't (or no longer) recognize.
    logger.warn("SHOPIFY", `Webhook received for unrecognized shop ${shopDomain}`);
    sendSuccess(res, { received: true });
    return;
  }

  if (webhookId) {
    try {
      await WebhookEvent.create({
        provider: "SHOPIFY",
        externalEventId: webhookId,
        merchantId: merchant._id,
        topic,
        status: "RECEIVED",
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        logger.info("SHOPIFY", `Duplicate ${topic} webhook ${webhookId} — already processed`);
        sendSuccess(res, { received: true, duplicate: true });
        return;
      }
      throw error;
    }
  }

  const payload = req.body as ShopifyOrderPayload;
  logger.info("SHOPIFY", `Webhook received: ${topic}`, { shopDomain, shopifyOrderId: payload.id });

  if (topic === "orders/create") {
    const mapped = mapShopifyOrderPayload(payload);
    await OrderService.createOrderFromShopify(String(merchant._id), mapped);
  }
  // orders/updated: acknowledged and logged for now — no order-mutation
  // logic was requested beyond initial creation + the confirmation flow.

  if (webhookId) {
    await WebhookEvent.updateOne(
      { provider: "SHOPIFY", externalEventId: webhookId },
      { status: "PROCESSED", processedAt: new Date() },
    );
  }

  sendSuccess(res, { received: true });
}

export const ShopifyWebhookController = {
  ordersCreate: (req: Request, res: Response): Promise<void> => handleOrderWebhook(req, res, "orders/create"),
  ordersUpdated: (req: Request, res: Response): Promise<void> => handleOrderWebhook(req, res, "orders/updated"),
};
