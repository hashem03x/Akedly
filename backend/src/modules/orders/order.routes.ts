import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import * as orderController from "./order.controller";

const router = Router();
router.use(requireAuth());

router.get("/overview", orderController.getOverview);
router.get("/", orderController.listOrders);
router.get("/:orderId", orderController.getOrder);

export default router;
