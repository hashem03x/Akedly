import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import * as diagnosticsController from "./diagnostics.controller";

const router = Router();
router.use(requireAuth());

router.post("/whatsapp", diagnosticsController.sendWhatsAppDiagnostic);
router.post("/whatsapp-template", diagnosticsController.sendWhatsAppTemplateDiagnostic);

export default router;
