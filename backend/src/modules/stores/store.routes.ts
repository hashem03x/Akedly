import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import * as storeController from "./store.controller";

const router = Router();
router.use(requireAuth());

router.get("/", storeController.listStores);
router.post("/woocommerce", storeController.connectWooCommerce);
router.get("/:storeId", storeController.getStore);
router.post("/:storeId/test-connection", storeController.testConnection);
router.post("/:storeId/disconnect", storeController.disconnect);
router.patch("/:storeId/settings", storeController.updateSettings);

export default router;
