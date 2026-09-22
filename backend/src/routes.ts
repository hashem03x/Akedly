import { Router } from "express";
import authRoutes from "./modules/auth/auth.routes";
import merchantRoutes from "./modules/merchants/merchant.routes";
import storeRoutes from "./modules/stores/store.routes";
import orderRoutes from "./modules/orders/order.routes";
import confirmationRoutes from "./modules/confirmations/confirmation.routes";
import communicationRoutes from "./modules/communications/communication.routes";
import shopifyOAuthRoutes from "./modules/stores/shopify-oauth.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/merchants", merchantRoutes);
router.use("/stores", storeRoutes);
router.use("/orders", orderRoutes);
router.use("/confirmations", confirmationRoutes);
router.use("/communications", communicationRoutes);
router.use("/integrations/shopify/oauth", shopifyOAuthRoutes);

export default router;
