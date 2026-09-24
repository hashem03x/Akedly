import type { MessageLanguage, OrderConfirmationMessageInput } from "./whatsapp-provider.interface";

export interface ConfirmationMessageButton {
  id: "confirm" | "cancel";
  title: string;
}

export interface ConfirmationMessage {
  body: string;
  buttons: ConfirmationMessageButton[];
}

const CURRENCY_LABEL: Record<string, { ar: string; en: string }> = {
  EGP: { ar: "جنيه", en: "EGP" },
};

export function formatCurrency(amount: number, currency: string, language: MessageLanguage): string {
  const label = CURRENCY_LABEL[currency]?.[language] ?? currency;
  const value = amount.toLocaleString(language === "ar" ? "ar-EG" : "en-US");
  return language === "ar" ? `${value} ${label}` : `${value} ${label}`;
}

/** Builds the localized WhatsApp order-confirmation message. Configurable per merchant later. */
export function buildOrderConfirmationMessage(
  input: OrderConfirmationMessageInput
): ConfirmationMessage {
  const total = formatCurrency(input.total, input.currency, input.language);
  const itemLines = input.items
    .map((item) => `${item.quantity} × ${item.name}`)
    .join("\n");

  if (input.language === "ar") {
    return {
      body: [
        `أهلاً ${input.customerName}،`,
        "",
        `تم استلام طلبك رقم #${input.orderNumber} من ${input.storeName}.`,
        "",
        itemLines,
        `الإجمالي: ${total}`,
        "",
        "هل تريد تأكيد الطلب؟",
      ].join("\n"),
      buttons: [
        { id: "confirm", title: "تأكيد الطلب" },
        { id: "cancel", title: "إلغاء الطلب" },
      ],
    };
  }

  return {
    body: [
      `Hi ${input.customerName},`,
      "",
      `We received your order #${input.orderNumber} from ${input.storeName}.`,
      "",
      itemLines,
      `Total: ${total}`,
      "",
      "Would you like to confirm this order?",
    ].join("\n"),
    buttons: [
      { id: "confirm", title: "Confirm Order" },
      { id: "cancel", title: "Cancel Order" },
    ],
  };
}
