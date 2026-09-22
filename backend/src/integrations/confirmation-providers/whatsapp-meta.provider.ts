import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { buildOrderConfirmationMessage } from "./message-templates";
import type {
  OrderConfirmationMessageInput,
  SendMessageResult,
  WhatsAppProvider,
} from "./whatsapp-provider.interface";

/**
 * Meta WhatsApp Business Platform (Cloud API) provider.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Sends an interactive "button" message. Button ids are prefixed with the
 * order id (`confirm:<orderId>` / `cancel:<orderId>`) so the webhook handler
 * can identify the order without a separate lookup table.
 */
export class WhatsAppMetaProvider implements WhatsAppProvider {
  readonly name = "meta";

  async sendOrderConfirmation(input: OrderConfirmationMessageInput): Promise<SendMessageResult> {
    if (!env.whatsapp.metaAccessToken || !env.whatsapp.metaPhoneNumberId) {
      return { success: false, error: "WhatsApp Meta credentials are not configured." };
    }

    const message = buildOrderConfirmationMessage(input);
    const url = `https://graph.facebook.com/${"v20.0"}/${env.whatsapp.metaPhoneNumberId}/messages`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.whatsapp.metaAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: input.toPhone,
          type: "interactive",
          interactive: {
            type: "button",
            body: { text: message.body },
            action: {
              buttons: message.buttons.map((button) => ({
                type: "reply",
                reply: { id: `${button.id}:${input.orderId}`, title: button.title },
              })),
            },
          },
        }),
      });

      const body = (await res.json()) as {
        messages?: { id?: string }[];
        error?: { message?: string };
      };

      if (!res.ok) {
        logger.error("WhatsApp Meta send failed", { status: res.status, error: body.error });
        return { success: false, error: body.error?.message ?? `HTTP ${res.status}` };
      }

      return { success: true, providerMessageId: body.messages?.[0]?.id };
    } catch (err) {
      logger.error("WhatsApp Meta send threw", { message: (err as Error).message });
      return { success: false, error: err instanceof Error ? err.message : "Send failed." };
    }
  }
}
