import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import * as confirmationController from "./confirmation.controller";

const router = Router();
router.use(requireAuth());

router.post("/:orderId/resend", confirmationController.resendConfirmation);
router.post("/:orderId/confirm", confirmationController.confirmOrderManually);
router.post("/:orderId/cancel", confirmationController.cancelOrderManually);

export default router;
