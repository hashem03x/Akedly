import { MerchantModel } from "../modules/merchants/merchant.model";
import { StoreModel } from "../modules/stores/store.model";
import { OrderModel, type OrderDocument } from "../modules/orders/order.model";
import { canTransition, confirmOrder, cancelOrder } from "../modules/confirmations/confirmation.service";
import { ApiError } from "../utils/api-error";

async function createOrder(): Promise<OrderDocument> {
  const merchant = await MerchantModel.create({
    name: "Test Merchant",
    email: `merchant_${Date.now()}_${Math.random()}@example.com`,
    passwordHash: "hash",
  });
  const store = await StoreModel.create({
    merchantId: merchant._id,
    platform: "shopify",
    name: "Leopard",
    domain: "leopard.myshopify.com",
    status: "connected",
  });
  return OrderModel.create({
    merchantId: merchant._id,
    storeId: store._id,
    externalOrderId: "1",
    orderNumber: "#1",
    customer: { name: "Ahmed Ali", phone: "+201001234567" },
    items: [{ name: "Item", quantity: 1, price: 100 }],
    subtotal: 100,
    shipping: 0,
    total: 100,
    currency: "EGP",
    platform: "shopify",
    confirmationStatus: "pending",
  });
}

describe("canTransition", () => {
  it("allows pending -> confirmed, pending -> cancelled, pending -> expired", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("pending", "cancelled")).toBe(true);
    expect(canTransition("pending", "expired")).toBe(true);
  });

  it("blocks transitions out of terminal states", () => {
    expect(canTransition("confirmed", "cancelled")).toBe(false);
    expect(canTransition("cancelled", "confirmed")).toBe(false);
    expect(canTransition("expired", "confirmed")).toBe(false);
  });
});

describe("confirmOrder / cancelOrder", () => {
  it("moves a pending order to confirmed", async () => {
    const order = await createOrder();
    const updated = await confirmOrder(order.id, { channel: "whatsapp" });
    expect(updated.confirmationStatus).toBe("confirmed");
    expect(updated.confirmedAt).toBeTruthy();
  });

  it("moves a pending order to cancelled", async () => {
    const order = await createOrder();
    const updated = await cancelOrder(order.id, { channel: "whatsapp" });
    expect(updated.confirmationStatus).toBe("cancelled");
    expect(updated.cancelledAt).toBeTruthy();
  });

  it("rejects cancelling an already-confirmed order (invalid transition)", async () => {
    const order = await createOrder();
    await confirmOrder(order.id, { channel: "whatsapp" });

    await expect(cancelOrder(order.id, { channel: "whatsapp" })).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
  });

  it("rejects confirming an already-cancelled order (customer confirms after cancellation)", async () => {
    const order = await createOrder();
    await cancelOrder(order.id, { channel: "whatsapp" });

    await expect(confirmOrder(order.id, { channel: "whatsapp" })).rejects.toBeInstanceOf(ApiError);
  });

  it("treats a duplicate confirmation as a no-op instead of throwing", async () => {
    const order = await createOrder();
    const first = await confirmOrder(order.id, { channel: "whatsapp" });
    const second = await confirmOrder(order.id, { channel: "whatsapp" });

    expect(second.confirmationStatus).toBe("confirmed");
    expect(second.confirmedAt?.getTime()).toBe(first.confirmedAt?.getTime());
  });
});
