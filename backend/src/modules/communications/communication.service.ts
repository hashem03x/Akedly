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
