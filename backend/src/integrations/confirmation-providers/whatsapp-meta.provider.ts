import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { maskPhone } from "../../utils/mask";
import { fetchWithTimeout, FetchTimeoutError } from "../../utils/http";
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
    const missing: string[] = [];
    if (!env.whatsapp.metaAccessToken) missing.push("WHATSAPP_META_ACCESS_TOKEN");
    if (!env.whatsapp.metaPhoneNumberId) missing.push("WHATSAPP_META_PHONE_NUMBER_ID");
    if (missing.length > 0) {
      logger.error("whatsapp_configuration_invalid", { missing });
      return { success: false, error: "WhatsApp Meta credentials are not configured." };
    }

    const message = buildOrderConfirmationMessage(input);

    logger.info("whatsapp_send_request", {
      provider: "meta",
      orderId: input.orderId,
      recipient: maskPhone(input.toPhone),
      messageType: "interactive_button",
      language: input.language,
      phoneNumberId: maskPhone(env.whatsapp.metaPhoneNumberId),
    });

    return this.send(
      {
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
      },
      { orderId: input.orderId }
    );
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

  private async send(
    payload: Record<string, unknown>,
    logCtx: { orderId?: string } = {}
  ): Promise<SendMessageResult> {
    const startedAt = Date.now();
    try {
      const res = await fetchWithTimeout(
        messagesUrl(),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.whatsapp.metaAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
        15_000
      );

      const durationMs = Date.now() - startedAt;
      const body = (await res.json()) as MetaErrorBody & { messages?: { id?: string }[] };

      if (!res.ok) {
        const errorDetails = parseMetaError(res.status, body);
        logger.error("whatsapp_send_failed", {
          orderId: logCtx.orderId,
          provider: "meta",
          httpStatus: res.status,
          providerErrorCode: errorDetails.code,
          providerErrorType: errorDetails.type,
          durationMs,
        });
        return { success: false, error: errorDetails.message, errorDetails };
      }

      const providerMessageId = body.messages?.[0]?.id;
      logger.info("whatsapp_send_success", {
        orderId: logCtx.orderId,
        provider: "meta",
        httpStatus: res.status,
        providerMessageId,
        durationMs,
      });
      return { success: true, providerMessageId };
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      const isTimeout = err instanceof FetchTimeoutError;
      logger.error(isTimeout ? "whatsapp_provider_timeout" : "whatsapp_send_failed", {
        orderId: logCtx.orderId,
        provider: "meta",
        errorCategory: isTimeout ? "timeout" : "network",
        message: err instanceof Error ? err.message : String(err),
        durationMs,
      });
      return { success: false, error: err instanceof Error ? err.message : "Send failed." };
    }
  }
}
