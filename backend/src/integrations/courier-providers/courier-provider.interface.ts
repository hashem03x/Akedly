/**
 * V3 (not implemented yet). Only ever invoked for confirmed orders — never for
 * pending or cancelled ones — once a real courier integration is added.
 */
export type ShipmentStatus =
  | "pending"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed"
  | "returned";

export interface ShipmentInput {
  orderId: string;
  merchantId: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  codAmount?: number;
  currency: string;
}

export interface Shipment {
  courierName: string;
  trackingNumber: string;
  status: ShipmentStatus;
  raw?: unknown;
}

export interface CourierProvider {
  readonly name: string;
  createShipment(order: ShipmentInput): Promise<Shipment>;
  getShipmentStatus(trackingNumber: string): Promise<ShipmentStatus>;
}
