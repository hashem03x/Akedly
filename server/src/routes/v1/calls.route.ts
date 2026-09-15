import { Router } from "express";
import { VoiceController } from "../../controllers/voice.controller";
import { authGuard } from "../../middleware/auth-guard";

export const callsRouter = Router();

callsRouter.post("/:orderId", authGuard, VoiceController.triggerCall);
