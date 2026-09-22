import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { listActivity } from "./communication.controller";

const router = Router();
router.use(requireAuth());

router.get("/", listActivity);

export default router;
