import { env } from "../../config/env";
import type { WhatsAppProvider } from "./whatsapp-provider.interface";
import { WhatsAppMockProvider } from "./whatsapp-mock.provider";
import { WhatsAppMetaProvider } from "./whatsapp-meta.provider";

let cachedProvider: WhatsAppProvider | null = null;

export function getWhatsAppProvider(): WhatsAppProvider {
  if (cachedProvider) return cachedProvider;

  cachedProvider = env.whatsapp.provider === "mock" ? new WhatsAppMockProvider() : new WhatsAppMetaProvider();
  return cachedProvider;
}

export type {
  WhatsAppProvider,
  OrderConfirmationMessageInput,
  SendMessageResult,
  InboundConfirmationReply,
} from "./whatsapp-provider.interface";
