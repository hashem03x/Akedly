import { Router } from "express";
import { VoiceWebhookController } from "../../../controllers/voice-webhook.controller";

export const voiceWebhookRouter = Router();

voiceWebhookRouter.post("/twiml/:orderId", VoiceWebhookController.twiml);
voiceWebhookRouter.post("/gather/:orderId", VoiceWebhookController.gather);
voiceWebhookRouter.post("/status/:orderId", VoiceWebhookController.status);
