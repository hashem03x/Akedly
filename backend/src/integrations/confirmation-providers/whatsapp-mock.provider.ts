import crypto from "crypto";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { maskPhone } from "../../utils/mask";
import { formatCurrency } from "./message-templates";
import { CONFIRMATION_TEMPLATE_LANGUAGE } from "./whatsapp-meta.provider";
import type {
  OrderConfirmationMessageInput,
  SendMessageResult,
  SendTemplateMessageInput,
  WhatsAppProvider,
} from "./whatsapp-provider.interface";

/**
 * Development-only provider. Never enabled in production (see config/env.ts).
 * Logs the message instead of calling a real WhatsApp API, so the full
 * order -> confirmation -> response loop can be exercised locally via the
 * dev "simulate reply" webhook endpoint. Mirrors the real Meta provider's
 * template-based send (see whatsapp-meta.provider.ts) so local testing
 * exercises the same shape production actually sends.
 */
export class WhatsAppMockProvider implements WhatsAppProvider {
  readonly name = "mock";

  async sendOrderConfirmation(input: OrderConfirmationMessageInput): Promise<SendMessageResult> {
    const providerMessageId = `mock_${crypto.randomUUID()}`;

    logger.info(`[MOCK WHATSAPP] Template "${env.whatsapp.confirmationTemplateName}" sent to ${maskPhone(input.toPhone)}`, {
      orderId: input.orderId,
      template: env.whatsapp.confirmationTemplateName,
      language: CONFIRMATION_TEMPLATE_LANGUAGE,
      parameters: {
        customer_name: input.customerName,
        order_id: `#${input.orderNumber}`,
        store_name: input.storeName,
        order_total: formatCurrency(input.total, input.currency, "en"),
      },
      providerMessageId,
    });

    return { success: true, providerMessageId };
  }

  async sendTemplateMessage(input: SendTemplateMessageInput): Promise<SendMessageResult> {
    const providerMessageId = `mock_${crypto.randomUUID()}`;

    logger.info(`[MOCK WHATSAPP] Template "${input.templateName}" sent to ${maskPhone(input.toPhone)}`, {
      templateName: input.templateName,
      languageCode: input.languageCode,
      providerMessageId,
    });

    return { success: true, providerMessageId };
  }

  async sendTextMessage(toPhone: string, body: string): Promise<SendMessageResult> {
    const providerMessageId = `mock_${crypto.randomUUID()}`;

    logger.info(`[MOCK WHATSAPP] Text sent to ${maskPhone(toPhone)}`, { body, providerMessageId });

    return { success: true, providerMessageId };
  }
}
