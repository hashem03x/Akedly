import { StoreModel } from "../modules/stores/store.model";
import { MerchantModel } from "../modules/merchants/merchant.model";
import { OrderModel } from "../modules/orders/order.model";
import { ingestOrder } from "../modules/orders/order.service";
import { claimWebhookEvent, completeWebhookEvent, failWebhookEvent } from "../modules/webhooks/webhook-event.model";
import type { NormalizedOrderInput } from "../modules/orders/order.types";

async function createStore() {
  const merchant = await MerchantModel.create({
    name: "Test Merchant",
    email: `merchant_${Date.now()}_${Math.random()}@example.com`,
    passwordHash: "hash",
  });
  return StoreModel.create({
    merchantId: merchant._id,
    platform: "shopify",
    name: "Leopard",
    domain: "leopard.myshopify.com",
    status: "connected",
  });
}

const normalizedOrder: NormalizedOrderInput = {
  externalOrderId: "9001",
  orderNumber: "#9001",
  customer: { name: "Ahmed Ali", phone: "+201001234567" },
  items: [{ name: "Nike T-Shirt", quantity: 2, price: 725 }],
  subtotal: 1450,
  shipping: 0,
  total: 1450,
  currency: "EGP",
};

describe("ingestOrder idempotency", () => {
  it("creates an order once and treats a duplicate delivery as a no-op", async () => {
    const store = await createStore();

    const first = await ingestOrder(store, normalizedOrder);
    expect(first.created).toBe(true);

    const second = await ingestOrder(store, normalizedOrder);
    expect(second.created).toBe(false);
    expect(second.order.id).toBe(first.order.id);

    const count = await OrderModel.countDocuments({ storeId: store._id });
    expect(count).toBe(1);
  });

  it("keeps orders from different stores independent even with the same external id", async () => {
    const storeA = await createStore();
    const storeB = await createStore();

    await ingestOrder(storeA, normalizedOrder);
    await ingestOrder(storeB, normalizedOrder);

    const count = await OrderModel.countDocuments({ externalOrderId: normalizedOrder.externalOrderId });
    expect(count).toBe(2);
  });
});

describe("claimWebhookEvent", () => {
  it("returns true for the first delivery and false for a retry after it completed successfully", async () => {
    const claimedFirst = await claimWebhookEvent("shopify", "evt-123");
    await completeWebhookEvent("shopify", "evt-123");
    const claimedSecond = await claimWebhookEvent("shopify", "evt-123");

    expect(claimedFirst).toBe(true);
    expect(claimedSecond).toBe(false);
  });

  it("treats the same key from different sources as independent", async () => {
    const shopify = await claimWebhookEvent("shopify", "evt-shared");
    const woocommerce = await claimWebhookEvent("woocommerce", "evt-shared");

    expect(shopify).toBe(true);
    expect(woocommerce).toBe(true);
  });

  it("keeps an event retryable if it was claimed but never completed (crash mid-processing)", async () => {
    const claimed = await claimWebhookEvent("shopify", "evt-stuck");
    expect(claimed).toBe(true);

    // Simulates the process dying between claim and completeWebhookEvent — the
    // record is stuck at status "processing" forever unless retried.
    const retried = await claimWebhookEvent("shopify", "evt-stuck");
    expect(retried).toBe(true);
  });

  it("allows reprocessing after failWebhookEvent marks a claim as failed", async () => {
    await claimWebhookEvent("shopify", "evt-failed-once");
    await failWebhookEvent("shopify", "evt-failed-once");

    const retried = await claimWebhookEvent("shopify", "evt-failed-once");
    expect(retried).toBe(true);
  });

  it("treats a completed event as a true duplicate, not retryable", async () => {
    await claimWebhookEvent("shopify", "evt-done");
    await completeWebhookEvent("shopify", "evt-done");

    const duplicate = await claimWebhookEvent("shopify", "evt-done");
    expect(duplicate).toBe(false);
  });
});
