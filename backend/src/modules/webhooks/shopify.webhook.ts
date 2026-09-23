import type { Request, Response } from "express";
import crypto from "crypto";
import { env } from "../../config/env";
import { asyncHandler } from "../../middleware/error.middleware";
import { sendError, sendSuccess } from "../../utils/api-response";
import { logger } from "../../utils/logger";
import { generateRequestId, runWithRequestId } from "../../utils/request-context";
import { getStoreProvider } from "../../integrations/store-providers";
import { StoreModel } from "../stores/store.model";
import { ingestOrder } from "../orders/order.service";
import { sendConfirmationForOrder } from "../confirmations/confirmation.service";
import { claimWebhookEvent, completeWebhookEvent, failWebhookEvent } from "./webhook-event.model";

const ORDERS_CREATE_TOPIC = "orders/create";

export const handleShopifyWebhook = asyncHandler(async (req: Request, res: Response) =>
  runWithRequestId(generateRequestId(), () => handleShopifyWebhookInner(req, res))
);

async function handleShopifyWebhookInner(req: Request, res: Response) {
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

  // Sorted newest-first as a defensive measure: a shop domain must map to exactly
  // one store, but merchant deletion/reconnection can leave an orphaned Store
  // record behind for the same domain under a stale merchantId (see
  // store.service.ts's upsertShopifyStoreFromOAuth, which is the real fix —
  // this is a safety net so a future data-hygiene slip degrades to "picks the
  // most recently connected store" instead of "picks whichever one Mongo felt
  // like returning").
  const matchingStores = await StoreModel.find({ platform: "shopify", domain: domain.toLowerCase() }).sort({
    createdAt: -1,
  });
  const store = matchingStores.find((s) => s.status === "connected") ?? matchingStores[0];
  if (!store) {
    return sendError(res, 404, "STORE_NOT_FOUND", "No store is registered for this shop domain.");
  }
  if (matchingStores.length > 1) {
    logger.error("shopify_webhook_multiple_stores_for_domain", {
      shop: domain,
      matchedStoreIds: matchingStores.map((s) => s.id),
      selectedStoreId: store.id,
      selectedMerchantId: String(store.merchantId),
    });
  }
  logger.info("store_resolved", { shop: domain, storeId: store.id, merchantId: String(store.merchantId) });

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
  logger.info("shopify_order_created", { shop: domain, storeId: store.id, orderId: order.id, created });

  // Sending the WhatsApp confirmation is awaited BEFORE responding to Shopify,
  // not fired-and-forgotten after sendSuccess. This is a serverless deployment
  // (Vercel, see backend/api/index.ts) — a Node process is not guaranteed to
  // keep running background work once its HTTP response has been sent, so any
  // code placed after the response here would race the platform freezing/
  // tearing down the function and silently never complete. A single WhatsApp
  // API call comfortably fits inside Shopify's 5s webhook timeout budget; if
  // that stops being true (e.g. a slower provider), move this to a real queue
  // rather than reintroducing the post-response race.
  if (created && store.settings?.autoConfirmationEnabled) {
    logger.info("confirmation_requested", { shop: domain, storeId: store.id, orderId: order.id });
    try {
      await sendConfirmationForOrder(order, store);
    } catch (err) {
      logger.error("shopify_order_processing_failed", {
        shop: domain,
        storeId: store.id,
        orderId: order.id,
        stage: "whatsapp_send",
        errorName: err instanceof Error ? err.name : "UnknownError",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  } else if (created) {
    logger.info("confirmation_skipped_auto_confirm_disabled", { shop: domain, storeId: store.id, orderId: order.id });
  }

  sendSuccess(res, { orderId: order.id, created });
  return;
}
