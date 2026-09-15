import { Router } from "express";
import { authRouter } from "./auth.route";
import { callsRouter } from "./calls.route";
import { dashboardRouter } from "./dashboard.route";
import { healthRouter } from "./health.route";
import { shopifyIntegrationRouter } from "./integrations/shopify.route";
import { ordersRouter } from "./orders.route";
import { protectedTestRouter } from "./protected-test.route";
import { shopifyWebhookRouter } from "./webhooks/shopify.route";
import { voiceWebhookRouter } from "./webhooks/voice.route";
import { whatsappWebhookRouter } from "./webhooks/whatsapp.route";

export const v1Router = Router();

v1Router.use("/health", healthRouter);
v1Router.use("/auth", authRouter);
v1Router.use("/protected-test", protectedTestRouter);

v1Router.use("/integrations/shopify", shopifyIntegrationRouter);

v1Router.use("/webhooks/shopify", shopifyWebhookRouter);
v1Router.use("/webhooks/whatsapp", whatsappWebhookRouter);
v1Router.use("/webhooks/voice", voiceWebhookRouter);

v1Router.use("/orders", ordersRouter);
v1Router.use("/calls", callsRouter);
v1Router.use("/dashboard", dashboardRouter);
