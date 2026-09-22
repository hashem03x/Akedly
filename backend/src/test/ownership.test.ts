import { MerchantModel } from "../modules/merchants/merchant.model";
import { StoreModel } from "../modules/stores/store.model";
import { OrderModel } from "../modules/orders/order.model";
import { getOwnedOrder } from "../modules/orders/order.service";
import { getOwnedStore } from "../modules/stores/store.service";
import { ApiError } from "../utils/api-error";

describe("merchant data isolation", () => {
  it("does not let merchant A read merchant B's order", async () => {
    const merchantA = await MerchantModel.create({
      name: "Merchant A",
      email: "a@example.com",
      passwordHash: "hash",
    });
    const merchantB = await MerchantModel.create({
      name: "Merchant B",
      email: "b@example.com",
      passwordHash: "hash",
    });

    const storeB = await StoreModel.create({
      merchantId: merchantB._id,
      platform: "shopify",
      name: "B Store",
      domain: "b-store.myshopify.com",
      status: "connected",
    });

    const orderB = await OrderModel.create({
      merchantId: merchantB._id,
      storeId: storeB._id,
      externalOrderId: "1",
      orderNumber: "#1",
      customer: { name: "Customer", phone: "+201000000000" },
      items: [{ name: "Item", quantity: 1, price: 10 }],
      subtotal: 10,
      shipping: 0,
      total: 10,
      currency: "EGP",
      platform: "shopify",
    });

    await expect(getOwnedOrder(merchantA.id, orderB.id)).rejects.toMatchObject({
      code: "ORDER_NOT_FOUND",
    });

    await expect(getOwnedOrder(merchantB.id, orderB.id)).resolves.toMatchObject({
      id: orderB.id,
    });
  });

  it("does not let merchant A read merchant B's store", async () => {
    const merchantA = await MerchantModel.create({
      name: "Merchant A",
      email: "a2@example.com",
      passwordHash: "hash",
    });
    const merchantB = await MerchantModel.create({
      name: "Merchant B",
      email: "b2@example.com",
      passwordHash: "hash",
    });

    const storeB = await StoreModel.create({
      merchantId: merchantB._id,
      platform: "woocommerce",
      name: "B Store",
      domain: "b-store.com",
      status: "connected",
    });

    await expect(getOwnedStore(merchantA.id, storeB.id)).rejects.toBeInstanceOf(ApiError);
  });
});
