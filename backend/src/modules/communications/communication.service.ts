import { CommunicationModel, type CommunicationDocument } from "./communication.model";

export interface RecordCommunicationInput {
  merchantId: string;
  orderId: string;
  channel: CommunicationDocument["channel"];
  direction: CommunicationDocument["direction"];
  type: CommunicationDocument["type"];
  status: CommunicationDocument["status"];
  providerMessageId?: string;
  metadata?: Record<string, unknown>;
}

export async function recordCommunication(
  input: RecordCommunicationInput
): Promise<CommunicationDocument> {
  return CommunicationModel.create(input);
}

export async function listCommunicationsForOrder(orderId: string): Promise<CommunicationDocument[]> {
  return CommunicationModel.find({ orderId }).sort({ createdAt: 1 });
}

/**
 * Applies a delivery-status update (sent/delivered/read/failed) from a WhatsApp
 * status webhook to the outbound communication record it belongs to, identified
 * by the provider's message id. No-op if we don't have a matching record —
 * status webhooks can arrive for messages this instance doesn't know about
 * (e.g. sent by a different provider/account) and that must never be an error.
 */
export async function updateCommunicationStatusByProviderMessageId(
  providerMessageId: string,
  status: CommunicationDocument["status"],
  metadata?: Record<string, unknown>
): Promise<CommunicationDocument | null> {
  return CommunicationModel.findOneAndUpdate(
    { providerMessageId, direction: "outbound" },
    { $set: { status, ...(metadata ? { metadata } : {}) } },
    { new: true }
  );
}
