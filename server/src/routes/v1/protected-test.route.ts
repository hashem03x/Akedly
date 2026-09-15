import { Router } from "express";
import { authGuard } from "../../middleware/auth-guard";
import { sendSuccess } from "../../utils/api-response";

/**
 * Not a real feature — exists to prove authGuard works as a standalone,
 * reusable middleware ahead of Phase 4+ routes (orders, dashboard, etc.)
 * mounting it the same way.
 */
export const protectedTestRouter = Router();

protectedTestRouter.get("/", authGuard, (req, res) => {
  sendSuccess(res, { merchantId: req.merchantId });
});
