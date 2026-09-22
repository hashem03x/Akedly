import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { authRateLimiter } from "../../middleware/rate-limit.middleware";
import * as authController from "./auth.controller";

const router = Router();

router.post("/register", authRateLimiter, authController.register);
router.post("/login", authRateLimiter, authController.login);
router.post("/logout", authController.logout);
router.get("/me", requireAuth(), authController.me);

export default router;
