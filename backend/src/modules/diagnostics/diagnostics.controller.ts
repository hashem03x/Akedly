import type { Response } from "express";
import { z } from "zod";
import { env } from "../../config/env";
import { asyncHandler } from "../../middleware/error.middleware";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { sendSuccess } from "../../utils/api-response";
import { logger } from "../../utils/logger";
import { generateRequestId, runWithRequestId } from "../../utils/request-context";
import { maskPhone } from "../../utils/mask";
import { getWhatsAppProvider } from "../../integrations/confirmation-providers";

const diagnosticSchema = z.object({
  // E.164-ish: leading +, 8-15 digits. Intentionally permissive — this is a
  // developer diagnostic tool, not customer-facing order intake.
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/, "Provide a phone number in E.164 format, e.g. +201234567890."),
});

/**
 * Separates "is Shopify broken" from "is WhatsApp broken" by exercising the
 * exact same WhatsAppProvider used by the real order-confirmation flow,
 * independent of any Shopify/WooCommerce order. Requires an authenticated
 * merchant session — there's no separate admin role in this app, so any
 * logged-in merchant can diagnose their own WhatsApp configuration.
 */
export const sendWhatsAppDiagnostic = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
  runWithRequestId(generateRequestId(), async () => {
    const input = diagnosticSchema.parse(req.body);
    const maskedPhone = maskPhone(input.phone);

    logger.info("whatsapp_diagnostic_started", {
      merchantId: req.merchantId,
      provider: env.whatsapp.provider,
      recipient: maskedPhone,
    });

    const provider = getWhatsAppProvider();
    const startedAt = Date.now();

    const result = await provider.sendTemplateMessage({
      toPhone: input.phone,
      templateName: "hello_world",
      languageCode: "en_US",
    });

    const durationMs = Date.now() - startedAt;

    logger.info("whatsapp_diagnostic_completed", {
      merchantId: req.merchantId,
      provider: env.whatsapp.provider,
      recipient: maskedPhone,
      success: result.success,
      providerMessageId: result.providerMessageId,
      durationMs,
    });

    sendSuccess(res, {
      provider: env.whatsapp.provider,
      recipient: maskedPhone,
      success: result.success,
      providerMessageId: result.providerMessageId,
      error: result.error,
      durationMs,
    });
  })
);

/**
 * Exercises the REAL order-confirmation template (akedly_order_confirmation,
 * language "en") via the exact same sendOrderConfirmation code path
 * production Shopify orders use — independent of Shopify/order data, so a
 * failure here reproduces the real Meta error (e.g. 132001) without needing
 * a live order, and isolates it from the hello_world diagnostic above (which
 * only proves the token/phone-number-id can send *some* template, not that
 * THIS template resolves against the WABA Akedly is configured for).
 * Test values only — never real customer data, never hardcoded credentials.
 */
export const sendWhatsAppTemplateDiagnostic = asyncHandler(async (req: AuthenticatedRequest, res: Response) =>
  runWithRequestId(generateRequestId(), async () => {
    const input = diagnosticSchema.parse(req.body);
    const maskedPhone = maskPhone(input.phone);

    logger.info("whatsapp_template_diagnostic_started", {
      merchantId: req.merchantId,
      provider: env.whatsapp.provider,
      recipient: maskedPhone,
    });

    const provider = getWhatsAppProvider();
    const startedAt = Date.now();

    const result = await provider.sendOrderConfirmation({
      orderId: "diagnostic",
      toPhone: input.phone,
      language: "en",
      customerName: "Test Customer",
      storeName: "Akedly Diagnostic",
      orderNumber: "0000",
      items: [],
      total: 1,
      currency: "EGP",
    });

    const durationMs = Date.now() - startedAt;

    logger.info("whatsapp_template_diagnostic_completed", {
      merchantId: req.merchantId,
      provider: env.whatsapp.provider,
      recipient: maskedPhone,
      success: result.success,
      providerMessageId: result.providerMessageId,
      durationMs,
    });

    sendSuccess(res, {
      provider: env.whatsapp.provider,
      recipient: maskedPhone,
      success: result.success,
      providerMessageId: result.providerMessageId,
      error: result.error,
      errorDetails: result.errorDetails,
      durationMs,
    });
  })
);
