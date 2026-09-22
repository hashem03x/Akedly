import { Router, raw, json } from "express";
import { handleShopifyWebhook } from "./shopify.webhook";
import { handleWooCommerceWebhook } from "./woocommerce.webhook";
import {
  handleWhatsAppWebhook,
  simulateWhatsAppReply,
  verifyWhatsAppWebhook,
} from "./whatsapp.webhook";

const router = Router();

// Webhook bodies must stay as raw Buffers so signature verification (HMAC over the
// exact bytes sent) is possible — this must run before any JSON body parsing.
const rawJson = raw({ type: "*/*", limit: "2mb" });

router.post("/shopify", rawJson, handleShopifyWebhook);
router.post("/woocommerce", rawJson, handleWooCommerceWebhook);

router.get("/whatsapp", verifyWhatsAppWebhook);
router.post("/whatsapp", rawJson, handleWhatsAppWebhook);
router.post("/whatsapp/simulate", json(), simulateWhatsAppReply);

export default router;
