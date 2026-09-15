import { env } from "../../config/env";
import { AppError } from "../../utils/app-error";
import { logger } from "../../utils/logger";
import type {
  SendInteractiveMessageInput,
  SendMessageResult,
  SendTemplateMessageInput,
  SendTextMessageInput,
  WhatsAppProvider,
} from "./whatsapp-provider";

const GRAPH_API_VERSION = "v23.0";

interface GraphSendResponse {
  messages?: { id: string }[];
  error?: { message: string; type: string; code: number };
}

export class MetaWhatsAppProvider implements WhatsAppProvider {
  private requireConfig(): { accessToken: string; phoneNumberId: string } {
    if (!env.whatsappAccessToken || !env.whatsappPhoneNumberId) {
      throw new AppError(
        503,
        "WHATSAPP_NOT_CONFIGURED",
        "WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID are not set — cannot send WhatsApp messages",
      );
    }
    return { accessToken: env.whatsappAccessToken, phoneNumberId: env.whatsappPhoneNumberId };
  }

  private async send(body: Record<string, unknown>): Promise<SendMessageResult> {
    const { accessToken, phoneNumberId } = this.requireConfig();

    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
      },
    );

    const payload = (await response.json()) as GraphSendResponse;

    if (!response.ok || !payload.messages?.[0]) {
      logger.error("WHATSAPP", "Meta Graph API send failed", {
        status: response.status,
        error: payload.error?.message,
      });
      throw new AppError(
        502,
        "WHATSAPP_SEND_FAILED",
        payload.error?.message ?? `WhatsApp send failed with status ${response.status}`,
      );
    }

    return { externalId: payload.messages[0].id, status: "SENT" };
  }

  sendTemplateMessage(input: SendTemplateMessageInput): Promise<SendMessageResult> {
    const components: Record<string, unknown>[] = [];

    if (input.bodyParams?.length) {
      components.push({ type: "body", parameters: input.bodyParams });
    }

    input.buttonPayloads?.forEach((payload, index) => {
      components.push({
        type: "button",
        sub_type: "quick_reply",
        index,
        parameters: [{ type: "payload", payload }],
      });
    });

    return this.send({
      to: input.toPhone,
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.languageCode },
        components,
      },
    });
  }

  sendInteractiveMessage(input: SendInteractiveMessageInput): Promise<SendMessageResult> {
    return this.send({
      to: input.toPhone,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: input.bodyText },
        action: {
          buttons: input.buttons.map((button) => ({
            type: "reply",
            reply: { id: button.id, title: button.title },
          })),
        },
      },
    });
  }

  sendTextMessage(input: SendTextMessageInput): Promise<SendMessageResult> {
    return this.send({
      to: input.toPhone,
      type: "text",
      text: { body: input.text },
    });
  }
}
