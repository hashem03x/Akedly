export interface SendMessageResult {
  externalId: string;
  status: string;
}

export interface TemplateTextParam {
  type: "text";
  text: string;
}

export interface TemplateButtonPayloadParam {
  type: "payload";
  payload: string;
}

export interface SendTemplateMessageInput {
  toPhone: string;
  templateName: string;
  languageCode: string;
  bodyParams?: TemplateTextParam[];
  /** One entry per quick-reply button, in the same order the template defines them. */
  buttonPayloads?: string[];
}

export interface InteractiveButton {
  id: string;
  title: string;
}

export interface SendInteractiveMessageInput {
  toPhone: string;
  bodyText: string;
  buttons: InteractiveButton[];
}

export interface SendTextMessageInput {
  toPhone: string;
  text: string;
}

/**
 * Abstraction over the WhatsApp Business Platform so the rest of the app
 * (WhatsAppService, ConfirmationService) never depends on Meta-specific
 * request/response shapes directly.
 */
export interface WhatsAppProvider {
  sendTemplateMessage(input: SendTemplateMessageInput): Promise<SendMessageResult>;
  sendInteractiveMessage(input: SendInteractiveMessageInput): Promise<SendMessageResult>;
  sendTextMessage(input: SendTextMessageInput): Promise<SendMessageResult>;
}
