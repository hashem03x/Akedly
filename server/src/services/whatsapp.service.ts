import { MetaWhatsAppProvider } from "../integrations/whatsapp/meta-whatsapp-provider";
import type { SendMessageResult, WhatsAppProvider } from "../integrations/whatsapp/whatsapp-provider";
import { Communication } from "../models/communication.model";
import type { OrderDocument } from "../models/order.model";

const provider: WhatsAppProvider = new MetaWhatsAppProvider();

// Meta requires a pre-approved message template (not a freeform
// "interactive" message) for the first outbound message in a conversation,
// since the customer hasn't messaged us first. This template — with two
// quick-reply buttons — must be created and approved in the Meta Business
// dashboard; its name/language must match what's configured there.
const CONFIRMATION_TEMPLATE_NAME = "order_confirmation";
const CONFIRMATION_TEMPLATE_LANGUAGE = "en";

export const CONFIRM_BUTTON_PAYLOAD = "CONFIRM_ORDER";
export const CANCEL_BUTTON_PAYLOAD = "CANCEL_ORDER";

async function sendConfirmationMessage(order: OrderDocument, storeName: string): Promise<SendMessageResult> {
  const result = await provider.sendTemplateMessage({
    toPhone: order.customer.phone,
    templateName: CONFIRMATION_TEMPLATE_NAME,
    languageCode: CONFIRMATION_TEMPLATE_LANGUAGE,
    bodyParams: [
      { type: "text", text: order.customer.name },
      { type: "text", text: storeName },
      { type: "text", text: `${order.total} ${order.currency}` },
    ],
    buttonPayloads: [CONFIRM_BUTTON_PAYLOAD, CANCEL_BUTTON_PAYLOAD],
  });

  await Communication.create({
    merchantId: order.merchantId,
    customerId: order.customerId,
    orderId: order._id,
    channel: "WHATSAPP",
    direction: "OUTBOUND",
    provider: "META",
    externalMessageId: result.externalId,
    content: `Order confirmation message sent for order ${order.shopifyOrderNumber}`,
    status: "SENT",
  });

  return result;
}

export const WhatsAppService = { sendConfirmationMessage };
