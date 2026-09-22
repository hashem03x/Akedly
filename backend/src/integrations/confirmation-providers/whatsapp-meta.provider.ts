import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { buildOrderConfirmationMessage } from "./message-templates";
import type {
  OrderConfirmationMessageInput,
  ProviderApiErrorInfo,
  SendMessageResult,
  SendTemplateMessageInput,
  WhatsAppProvider,
} from "./whatsapp-provider.interface";

interface MetaErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

function messagesUrl(): string {
  return `https://graph.facebook.com/${env.whatsapp.metaApiVersion}/${env.whatsapp.metaPhoneNumberId}/messages`;
}

/** Normalizes a Meta Graph API error response. Never includes the access token. */
function parseMetaError(httpStatus: number, body: MetaErrorBody): ProviderApiErrorInfo {
  return {
    httpStatus,
    code: body.error?.code,
    type: body.error?.type,
    message: body.error?.message ?? `Meta API responded with HTTP ${httpStatus}.`,
  };
}

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

    return this.send({
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
    });
  }

  async sendTemplateMessage(input: SendTemplateMessageInput): Promise<SendMessageResult> {
    if (!env.whatsapp.metaAccessToken || !env.whatsapp.metaPhoneNumberId) {
      return { success: false, error: "WhatsApp Meta credentials are not configured." };
    }

    return this.send({
      messaging_product: "whatsapp",
      to: input.toPhone,
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.languageCode },
      },
    });
  }

  private async send(payload: Record<string, unknown>): Promise<SendMessageResult> {
    try {
      const res = await fetch(messagesUrl(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.whatsapp.metaAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = (await res.json()) as MetaErrorBody & { messages?: { id?: string }[] };

      if (!res.ok) {
        const errorDetails = parseMetaError(res.status, body);
        logger.error("WhatsApp Meta send failed", {
          status: res.status,
          code: errorDetails.code,
          type: errorDetails.type,
        });
        return { success: false, error: errorDetails.message, errorDetails };
      }

      return { success: true, providerMessageId: body.messages?.[0]?.id };
    } catch (err) {
      logger.error("WhatsApp Meta send threw", { message: (err as Error).message });
      return { success: false, error: err instanceof Error ? err.message : "Send failed." };
    }
  }
}
