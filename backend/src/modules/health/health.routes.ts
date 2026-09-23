import { Router } from "express";
import mongoose from "mongoose";
import { env } from "../../config/env";
import { sendSuccess } from "../../utils/api-response";

const router = Router();

router.get("/", (_req, res) => {
  sendSuccess(res, { status: "ok" });
});

/**
 * Dependency-level health check: reports whether each external integration is
 * *configured* (env vars present) and, for MongoDB, actually connected — never
 * whether a given merchant's credentials are valid, and never any secret value
 * itself. Meant for quick production triage ("is this even a config problem?")
 * before digging into logs for a specific order/merchant.
 */
router.get("/dependencies", (_req, res) => {
  const mongoStates: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  const mongoState = mongoStates[mongoose.connection.readyState] ?? "unknown";
  const mongodbHealthy = mongoose.connection.readyState === 1;

  const shopifyConfigured = Boolean(env.shopify.clientId && env.shopify.clientSecret);

  const whatsappConfigured =
    env.whatsapp.provider === "mock"
      ? true
      : Boolean(env.whatsapp.metaAccessToken && env.whatsapp.metaPhoneNumberId && env.whatsapp.metaAppSecret);

  const dependencies = {
    mongodb: mongodbHealthy ? "healthy" : "unhealthy",
    shopify: shopifyConfigured ? "configured" : "not_configured",
    whatsapp: whatsappConfigured ? "configured" : "not_configured",
    whatsappProvider: env.whatsapp.provider,
  };

  const allHealthy = mongodbHealthy && shopifyConfigured && whatsappConfigured;
  const status = allHealthy ? "ok" : mongodbHealthy ? "degraded" : "down";

  sendSuccess(
    res,
    {
      status,
      dependencies,
      // Not a secret — purely diagnostic (helps tell "mongo is down" apart from
      // "mongo is still connecting on a cold serverless start").
      mongoConnectionState: mongoState,
    },
    allHealthy ? 200 : 503
  );
});

export default router;
