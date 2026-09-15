import { Router } from "express";
import { OrderController } from "../../controllers/order.controller";
import { authGuard } from "../../middleware/auth-guard";

export const ordersRouter = Router();

ordersRouter.use(authGuard);

ordersRouter.get("/", OrderController.list);
ordersRouter.get("/:id", OrderController.getById);
ordersRouter.get("/:id/communications", OrderController.communications);
ordersRouter.post("/:id/confirm", OrderController.confirm);
ordersRouter.post("/:id/cancel", OrderController.cancel);
ordersRouter.post("/:id/retry-confirmation", OrderController.retryConfirmation);
