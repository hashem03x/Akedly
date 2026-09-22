import crypto from "crypto";
import { logger } from "../../utils/logger";
import { maskPhone } from "../../utils/mask";
import { buildOrderConfirmationMessage } from "./message-templates";
import type {
  OrderConfirmationMessageInput,
  SendMessageResult,
  WhatsAppProvider,
} from "./whatsapp-provider.interface";

/**
 * Development-only provider. Never enabled in production (see config/env.ts).
 * Logs the message instead of calling a real WhatsApp API, so the full
 * order -> confirmation -> response loop can be exercised locally via the
 * dev "simulate reply" webhook endpoint.
 */
export class WhatsAppMockProvider implements WhatsAppProvider {
  readonly name = "mock";

  async sendOrderConfirmation(input: OrderConfirmationMessageInput): Promise<SendMessageResult> {
    const message = buildOrderConfirmationMessage(input);
    const providerMessageId = `mock_${crypto.randomUUID()}`;

    logger.info(`[MOCK WHATSAPP] Confirmation sent to ${maskPhone(input.toPhone)}`, {
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      body: message.body,
      buttons: message.buttons.map((b) => b.title),
      providerMessageId,
    });

    return { success: true, providerMessageId };
  }
}
