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

/**
 * MUST always be exactly "en" — independently verified against Meta's API by
 * hand (manual template send succeeded with this exact value) for the
 * approved akedly_order_confirmation template. Not "en_US"/"en_GB"/"ar"/
 * "ar_EG" — Meta treats template language as an exact match against what was
 * approved, not a locale negotiation. Deliberately a hardcoded literal, not
 * read from env/config or derived from customer/merchant locale — see PART 1
 * of the 2026-09-25 production incident report. Only this template is
 * affected; sendTemplateMessage (used for the separate hello_world
 * connectivity diagnostic) and all non-WhatsApp Arabic/English localization
 * elsewhere in the app are untouched.
 */
export const CONFIRMATION_TEMPLATE_LANGUAGE = "en";

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

    const template = {
      name: templateName,
      language: { code: CONFIRMATION_TEMPLATE_LANGUAGE as string },
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
    };

    // Guarantees the contract at the boundary rather than trusting every
    // future edit to keep it right — checks the actually-constructed payload
    // (not just the constant above), so it still catches drift if this
    // function is ever changed to source the language from somewhere else.
    // The provider must never silently "correct" a wrong value here; a wrong
    // value means the send must not happen at all.
    if (template.language.code !== "en") {
      throw new Error('Akedly order confirmation template must use language code "en".');
    }

    logger.info("order_confirmation_template_payload", {
      template: template.name,
      language: template.language.code,
      messageType: "template",
      orderId: input.orderId,
      provider: "meta",
    });

    logger.info("order_confirmation_template_send_started", {
      provider: "meta",
      orderId: input.orderId,
      recipient: maskPhone(input.toPhone),
      messageType: "template",
      template: templateName,
      language: template.language.code,
      phoneNumberId: maskPhone(env.whatsapp.metaPhoneNumberId),
    });

    // Sanitized dump of the exact outgoing payload shape — proves what Akedly
    // actually sends without leaking customer data (parameter values are
    // stripped, only parameter_name/type survive) or the access token. Meant
    // to be diffed against a known-good manual Meta API call when diagnosing
    // provider-side rejections (e.g. Meta error 132001) — see PART 2 of the
    // 2026-09-25 production incident report.
    logger.info("meta_whatsapp_outgoing_request", {
      phoneNumberId: maskPhone(env.whatsapp.metaPhoneNumberId),
      recipient: maskPhone(input.toPhone),
      type: "template",
      template: {
        name: template.name,
        language: template.language,
        components: template.components.map((c) => ({
          type: c.type,
          parameters: c.parameters.map((p) => ({ type: p.type, parameter_name: p.parameter_name })),
        })),
      },
    });

    const result = await this.send(
      { messaging_product: "whatsapp", to: input.toPhone, type: "template", template },
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
