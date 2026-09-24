import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { maskPhone } from "../../utils/mask";
import { fetchWithTimeout, FetchTimeoutError } from "../../utils/http";
import { formatCurrency } from "./message-templates";
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
 * sendOrderConfirmation sends the Meta-approved `akedly_order_confirmation`
 * template (name/language from env.whatsapp.confirmationTemplateName/Language),
 * not a freeform/interactive message. This is required, not stylistic: outside
 * an open 24h customer-service window (i.e. for the first message to a
 * customer who hasn't messaged the business first — true for essentially every
 * new order), WhatsApp Business Platform only allows pre-approved templates.
 * An interactive message here would return HTTP 200 with a wamid and then
 * fail asynchronously, reported only via the status webhook — see
 * webhooks/whatsapp.webhook.ts's processStatusUpdate and communication.model.ts's
 * "accepted" vs "sent"/"delivered" distinction.
 *
 * The template's two Quick Reply buttons return fixed payloads
 * ("confirm_order" / "cancel_order", configured in Meta Business Manager at
 * template-approval time — not something this send call controls) rather than
 * an embedded order id, so the reply is correlated back to an order via the
 * wamid this call returns (Communication.providerMessageId) and the inbound
 * reply's `context.id` — see whatsapp.webhook.ts's resolveOrderIdFromContext.
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

    const templateName = env.whatsapp.confirmationTemplateName;
    const templateLanguage = env.whatsapp.confirmationTemplateLanguage;

    logger.info("order_confirmation_template_send_started", {
      provider: "meta",
      orderId: input.orderId,
      recipient: maskPhone(input.toPhone),
      messageType: "template",
      template: templateName,
      language: templateLanguage,
      phoneNumberId: maskPhone(env.whatsapp.metaPhoneNumberId),
    });

    const result = await this.send(
      {
        messaging_product: "whatsapp",
        to: input.toPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLanguage },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", parameter_name: "customer_name", text: input.customerName },
                { type: "text", parameter_name: "order_id", text: `#${input.orderNumber}` },
                { type: "text", parameter_name: "store_name", text: input.storeName },
                // Formatted in the template's own language (fixed to "en" by
                // approval), not the merchant's messageLanguage setting — an
                // Arabic-formatted number ("500 جنيه") inside an English
                // template body would read as broken, not localized.
                { type: "text", parameter_name: "order_total", text: formatCurrency(input.total, input.currency, "en") },
              ],
            },
          ],
        },
      },
      { orderId: input.orderId }
    );

    logger.info(
      result.success ? "order_confirmation_template_send_success" : "order_confirmation_template_send_failed",
      { orderId: input.orderId, provider: "meta", success: result.success, providerMessageId: result.providerMessageId }
    );

    return result;
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

  /** Freeform text — only valid within an open 24h session. See interface doc. */
  async sendTextMessage(toPhone: string, body: string): Promise<SendMessageResult> {
    if (!env.whatsapp.metaAccessToken || !env.whatsapp.metaPhoneNumberId) {
      return { success: false, error: "WhatsApp Meta credentials are not configured." };
    }

    return this.send({
      messaging_product: "whatsapp",
      to: toPhone,
      type: "text",
      text: { body },
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
