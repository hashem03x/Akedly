import { Router } from "express";
import { ShopifyIntegrationController } from "../../../controllers/shopify-integration.controller";
import { authGuard } from "../../../middleware/auth-guard";

export const shopifyIntegrationRouter = Router();

shopifyIntegrationRouter.get("/install", authGuard, ShopifyIntegrationController.install);
shopifyIntegrationRouter.get("/callback", authGuard, ShopifyIntegrationController.callback);
shopifyIntegrationRouter.get("/status", authGuard, ShopifyIntegrationController.status);
shopifyIntegrationRouter.post("/disconnect", authGuard, ShopifyIntegrationController.disconnect);
