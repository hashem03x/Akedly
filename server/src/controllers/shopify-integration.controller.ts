import type { Request, Response } from "express";
import { env, isProduction } from "../config/env";
import {
  ShopifyIntegrationService,
  STATE_COOKIE_MAX_AGE_MS,
  STATE_COOKIE_NAME,
} from "../services/shopify-integration.service";
import { sendSuccess } from "../utils/api-response";
import { AppError } from "../utils/app-error";

function requireMerchantId(req: Request): string {
  if (!req.merchantId) throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  return req.merchantId;
}

function install(req: Request, res: Response): void {
  requireMerchantId(req); // authGuard already ran; this just enforces it explicitly
  const shop = req.query.shop;
  if (typeof shop !== "string") {
    throw new AppError(400, "MISSING_SHOP", "Query parameter 'shop' is required");
  }

  const { url, state } = ShopifyIntegrationService.buildInstallUrl(shop);

  res.cookie(STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/api/v1/integrations/shopify",
    maxAge: STATE_COOKIE_MAX_AGE_MS,
  });

  res.redirect(url);
}

async function callback(req: Request, res: Response): Promise<void> {
  const merchantId = requireMerchantId(req);
  const { shop, code } = req.query;
  if (typeof shop !== "string" || typeof code !== "string") {
    throw new AppError(400, "INVALID_CALLBACK", "Missing shop or code in Shopify callback");
  }

  const expectedState = req.cookies?.[STATE_COOKIE_NAME] as string | undefined;
  const query = Object.fromEntries(
    Object.entries(req.query).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );

  await ShopifyIntegrationService.handleCallback({ merchantId, shop, code, query, expectedState });

  res.clearCookie(STATE_COOKIE_NAME, { path: "/api/v1/integrations/shopify" });
  res.redirect(`${env.frontendUrl}/dashboard/integrations?shopify=connected`);
}

async function status(req: Request, res: Response): Promise<void> {
  const merchantId = requireMerchantId(req);
  const result = await ShopifyIntegrationService.getStatus(merchantId);
  sendSuccess(res, result);
}

async function disconnect(req: Request, res: Response): Promise<void> {
  const merchantId = requireMerchantId(req);
  await ShopifyIntegrationService.disconnect(merchantId);
  sendSuccess(res, { disconnected: true });
}

export const ShopifyIntegrationController = { install, callback, status, disconnect };
