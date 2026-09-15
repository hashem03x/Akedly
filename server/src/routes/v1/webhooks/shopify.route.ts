import { Router } from "express";
import { ShopifyWebhookController } from "../../../controllers/shopify-webhook.controller";

export const shopifyWebhookRouter = Router();

shopifyWebhookRouter.post("/orders/create", ShopifyWebhookController.ordersCreate);
shopifyWebhookRouter.post("/orders/updated", ShopifyWebhookController.ordersUpdated);
