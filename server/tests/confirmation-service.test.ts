import { Customer } from "../src/models/customer.model";
import { Merchant } from "../src/models/merchant.model";
import { Order, type OrderDocument } from "../src/models/order.model";
import { ConfirmationAttempt } from "../src/models/confirmation-attempt.model";
import { ConfirmationService } from "../src/services/confirmation.service";
import { clearTestDB, connectTestDB, disconnectTestDB } from "./helpers/db";

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

async function seedOrder(): Promise<OrderDocument> {
  const merchant = await Merchant.create({
    name: "Test Store",
    email: "store@example.com",
    passwordHash: "not-a-real-hash",
  });
  const customer = await Customer.create({ merchantId: merchant._id, name: "Ahmed", phone: "+201234567890" });
  return Order.create({
    merchantId: merchant._id,
    customerId: customer._id,
    shopifyOrderId: "1001",
    shopifyOrderNumber: "#1001",
    customer: { name: "Ahmed", phone: "+201234567890" },
    items: [{ title: "T-Shirt", quantity: 1, price: 250 }],
    subtotal: 250,
    shipping: 50,
    discount: 0,
    total: 300,
    currency: "EGP",
  });
}

describe("ConfirmationService.confirmOrder", () => {
  it("transitions PENDING_CONFIRMATION to CONFIRMED and updates customer stats", async () => {
    const order = await seedOrder();

    const confirmed = await ConfirmationService.confirmOrder(order.id as string, "MANUAL");

    expect(confirmed.status).toBe("CONFIRMED");
    expect(confirmed.confirmation.method).toBe("MANUAL");
    expect(confirmed.confirmation.confirmedAt).toBeInstanceOf(Date);

    const customer = await Customer.findById(order.customerId);
    expect(customer?.statistics.confirmedOrders).toBe(1);
  });

  it("is idempotent when confirmed twice (duplicate webhook)", async () => {
    const order = await seedOrder();

    const first = await ConfirmationService.confirmOrder(order.id as string, "WHATSAPP");
    const second = await ConfirmationService.confirmOrder(order.id as string, "WHATSAPP");

    expect(first.status).toBe("CONFIRMED");
    expect(second.status).toBe("CONFIRMED");

    // Confirming twice must not double-count the customer's stats.
    const customer = await Customer.findById(order.customerId);
    expect(customer?.statistics.confirmedOrders).toBe(1);
  });

  it("rejects CONFIRMED -> CANCELLED (a stale/duplicate webhook must not flip a resolved order)", async () => {
    const order = await seedOrder();
    await ConfirmationService.confirmOrder(order.id as string, "WHATSAPP");

    await expect(ConfirmationService.cancelOrder(order.id as string, "VOICE")).rejects.toMatchObject({
      code: "INVALID_ORDER_TRANSITION",
      statusCode: 409,
    });

    const order2 = await Order.findById(order._id);
    expect(order2?.status).toBe("CONFIRMED");
  });
});

describe("ConfirmationService.cancelOrder", () => {
  it("transitions PENDING_CONFIRMATION to CANCELLED and updates customer stats", async () => {
    const order = await seedOrder();

    const cancelled = await ConfirmationService.cancelOrder(order.id as string, "WHATSAPP");

    expect(cancelled.status).toBe("CANCELLED");
    const customer = await Customer.findById(order.customerId);
    expect(customer?.statistics.cancelledOrders).toBe(1);
  });

  it("rejects CANCELLED -> CONFIRMED", async () => {
    const order = await seedOrder();
    await ConfirmationService.cancelOrder(order.id as string, "WHATSAPP");

    await expect(ConfirmationService.confirmOrder(order.id as string, "VOICE")).rejects.toMatchObject({
      code: "INVALID_ORDER_TRANSITION",
    });
  });
});

describe("ConfirmationService attempt tracking", () => {
  it("marks the most recent open ConfirmationAttempt as completed on confirm", async () => {
    const order = await seedOrder();
    await ConfirmationAttempt.create({
      merchantId: order.merchantId,
      orderId: order._id,
      customerId: order.customerId,
      channel: "WHATSAPP",
      attemptNumber: 1,
      provider: "META",
      status: "PENDING",
    });

    await ConfirmationService.confirmOrder(order.id as string, "WHATSAPP");

    const attempt = await ConfirmationAttempt.findOne({ orderId: order._id });
    expect(attempt?.status).toBe("COMPLETED");
    expect(attempt?.result).toBe("CONFIRMED");
    expect(attempt?.completedAt).toBeInstanceOf(Date);
  });
});
