import { Router } from "express";
import { WhatsAppWebhookController } from "../../../controllers/whatsapp-webhook.controller";

export const whatsappWebhookRouter = Router();

whatsappWebhookRouter.get("/", WhatsAppWebhookController.verifyChallenge);
whatsappWebhookRouter.post("/", WhatsAppWebhookController.handleEvents);
