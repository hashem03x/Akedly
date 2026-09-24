// Dedicated file (not a test inside whatsapp-webhook.test.ts) so this can run
// against the real Meta provider (WHATSAPP_PROVIDER=meta) without disturbing
// the mock-provider setup the rest of that file relies on — each Jest test
// file gets its own module registry, so this needs no jest.resetModules()
// gymnastics. See whatsapp-webhook.test.ts's own top-of-file comment for why
// env vars are set before requiring local modules.
process.env.WHATSAPP_PROVIDER = "meta";
process.env.WHATSAPP_META_ACCESS_TOKEN = "test-access-token";
process.env.WHATSAPP_META_PHONE_NUMBER_ID = "1234567890";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { MerchantModel } = require("../modules/merchants/merchant.model");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { StoreModel } = require("../modules/stores/store.model");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { OrderModel } = require("../modules/orders/order.model");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { CommunicationModel } = require("../modules/communications/communication.model");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { sendConfirmationForOrder } = require("../modules/confirmations/confirmation.service");

describe("2026-09-25 production incident: Meta 132001 must never look like a successful send", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("records the communication as 'failed' (never accepted/sent/delivered) and leaves confirmationChannel unset when Meta returns 132001", async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 404,
      json: async () => ({
        error: {
          message: "(#132001) Template name does not exist in the translation",
          type: "OAuthException",
          code: 132001,
        },
      }),
    })) as unknown as typeof fetch;

    const merchant = await MerchantModel.create({
      name: "Test Merchant",
      email: `merchant_${Date.now()}_${Math.random()}@example.com`,
      passwordHash: "hash",
    });
    const store = await StoreModel.create({
      merchantId: merchant._id,
      platform: "shopify",
      name: "Leopard",
      domain: "leopard-132001.myshopify.com",
      status: "connected",
    });
    const order = await OrderModel.create({
      merchantId: merchant._id,
      storeId: store._id,
      externalOrderId: "132001-test",
      orderNumber: "1",
      customer: { name: "Ahmed Ali", phone: "+201001234567" },
      items: [],
      subtotal: 100,
      shipping: 0,
      total: 100,
      currency: "EGP",
      platform: "shopify",
      confirmationStatus: "pending",
    });

    const updated = await sendConfirmationForOrder(order, store);
    expect(updated.confirmationChannel).not.toBe("whatsapp");

    const comm = await CommunicationModel.findOne({ orderId: order._id, type: "confirmation_failed" });
    expect(comm).not.toBeNull();
    expect(comm.status).toBe("failed");
    expect(["accepted", "sent", "delivered", "read"]).not.toContain(comm.status);
    expect(comm.metadata.error).toContain("132001");
  });
});
