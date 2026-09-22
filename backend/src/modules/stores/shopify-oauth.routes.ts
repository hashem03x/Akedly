import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { shopifyOAuthCallback, startShopifyOAuth } from "./shopify-oauth.controller";

const router = Router();

// The merchant's browser navigates here directly (not fetch), so the existing
// session cookie carries auth — no bearer header needed for this to work.
router.get("/start", requireAuth(), startShopifyOAuth);

// Shopify redirects the browser here directly; it can't attach an Akedly auth
// header, so this route is intentionally NOT behind requireAuth(). The merchant
// is instead resolved from the validated, single-use OAuth state record.
router.get("/callback", shopifyOAuthCallback);

export default router;
