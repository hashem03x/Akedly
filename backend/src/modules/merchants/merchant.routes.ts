import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../middleware/error.middleware";
import { sendSuccess } from "../../utils/api-response";
import { toMerchantDto } from "./merchant.dto";

const router = Router();
router.use(requireAuth());

router.post(
  "/onboarding-complete",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    req.merchant!.onboardingCompleted = true;
    await req.merchant!.save();
    sendSuccess(res, { merchant: toMerchantDto(req.merchant!) });
  })
);

export default router;
