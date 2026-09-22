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
import { claimWebhookEvent, completeWebhookEvent, failWebhookEvent } from "./webhook-event.model";

const ORDERS_CREATE_TOPIC = "orders/create";

export const handleShopifyWebhook = asyncHandler(async (req: Request, res: Response) => {
  const rawBody = req.body as Buffer;
  const domain = req.header("x-shopify-shop-domain");
  const webhookId = req.header("x-shopify-webhook-id");
  const topic = req.header("x-shopify-topic");
  const hmacHeader = req.header("x-shopify-hmac-sha256");

  // Safe request-received diagnostics, logged before signature verification so a
  // request that never gets any further (bad signature, unknown store, etc.) still
  // leaves a trace. Never includes the access token, client secret, signature
  // value, or any customer/order data.
  logger.info("shopify_webhook_received", {
    method: req.method,
    path: req.path,
    shop: domain ?? null,
    topic: topic ?? null,
    webhookId: webhookId ?? null,
    hasSignature: Boolean(hmacHeader),
    contentType: req.header("content-type") ?? null,
    bodyLength: Buffer.isBuffer(rawBody) ? rawBody.length : 0,
  });

  if (!domain) {
    return sendError(res, 400, "MISSING_SHOP_DOMAIN", "Missing X-Shopify-Shop-Domain header.");
  }

  // Akedly only subscribes to orders/create, but Shopify's webhook UI lets a
  // merchant or app config add other topics pointing at the same URL. There's
  // nothing to retry for a topic we don't process, so this acks with 200 rather
  // than treating it as a processing failure.
  if (topic && topic !== ORDERS_CREATE_TOPIC) {
    logger.warn("shopify_webhook_unexpected_topic", { shop: domain, topic });
    return sendSuccess(res, { ignored: true });
  }

  const provider = getStoreProvider("shopify");

  if (!env.shopify.clientSecret) {
    logger.error("SHOPIFY_CLIENT_SECRET is not configured; rejecting webhook.");
    return sendError(res, 500, "WEBHOOK_NOT_CONFIGURED", "Shopify webhook verification is not configured.");
  }

  if (!provider.verifyWebhookSignature(rawBody, req.headers, env.shopify.clientSecret)) {
    return sendError(res, 401, "INVALID_SIGNATURE", "Webhook signature verification failed.");
  }
  logger.info("shopify_webhook_verified", { shop: domain, webhookId: webhookId ?? null });

  const store = await StoreModel.findOne({ platform: "shopify", domain: domain.toLowerCase() });
  if (!store) {
    return sendError(res, 404, "STORE_NOT_FOUND", "No store is registered for this shop domain.");
  }
  logger.info("store_resolved", { shop: domain, storeId: store.id });

  const idempotencyKey = webhookId ?? crypto.createHash("sha256").update(rawBody).digest("hex");
  const isNewDelivery = await claimWebhookEvent("shopify", idempotencyKey);
  if (!isNewDelivery) {
    logger.info("shopify_webhook_deduplicated", { shop: domain, storeId: store.id, webhookId: idempotencyKey });
    return sendSuccess(res, { deduplicated: true });
  }
  logger.info("shopify_webhook_claimed", { shop: domain, storeId: store.id, webhookId: idempotencyKey });

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch (err) {
    // Not retryable — corrupted JSON won't fix itself on redelivery — so this is
    // marked failed (not left "processing") but acknowledged with a client error
    // rather than a 500 that would trigger pointless Shopify retries.
    await failWebhookEvent("shopify", idempotencyKey);
    logger.error("shopify_webhook_processing_failed", {
      shop: domain,
      storeId: store.id,
      webhookId: idempotencyKey,
      operation: "parse_payload",
      errorName: err instanceof Error ? err.name : "UnknownError",
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    return sendError(res, 400, "MALFORMED_PAYLOAD", "Webhook payload was not valid JSON.");
  }

  let order;
  let created: boolean;
  try {
    const normalized = provider.normalizeOrder(payload);
    ({ order, created } = await ingestOrder(store, normalized));
  } catch (err) {
    // Leaves the event retryable (status "failed", not "completed") and responds
    // non-2xx so Shopify redelivers — a transient failure here (DB hiccup, cold
    // start timeout, validation edge case) must not permanently blackhole the
    // order the way an unconditional claim-before-process would.
    await failWebhookEvent("shopify", idempotencyKey);
    logger.error("shopify_webhook_processing_failed", {
      shop: domain,
      storeId: store.id,
      webhookId: idempotencyKey,
      operation: "ingest_order",
      errorName: err instanceof Error ? err.name : "UnknownError",
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  await completeWebhookEvent("shopify", idempotencyKey);
  logger.info("akedly_order_created", { shop: domain, storeId: store.id, orderId: order.id, created });

  sendSuccess(res, { orderId: order.id, created });

  if (created && store.settings?.autoConfirmationEnabled) {
    logger.info("confirmation_requested", { shop: domain, storeId: store.id, orderId: order.id });
    try {
      await sendConfirmationForOrder(order, store);
    } catch (err) {
      logger.error("Failed to send confirmation after Shopify order ingest", {
        shop: domain,
        storeId: store.id,
        orderId: order.id,
        errorName: err instanceof Error ? err.name : "UnknownError",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  } else if (created) {
    logger.info("confirmation_skipped_auto_confirm_disabled", { shop: domain, storeId: store.id, orderId: order.id });
  }
});
