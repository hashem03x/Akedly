import { ShopifyProvider } from "../integrations/store-providers/shopify.provider";
import { WooCommerceProvider } from "../integrations/store-providers/woocommerce.provider";

describe("ShopifyProvider.normalizeOrder", () => {
  const provider = new ShopifyProvider();

  it("maps a Shopify order payload into the internal order shape", () => {
    const normalized = provider.normalizeOrder({
      id: 5551234,
      name: "#1042",
      email: "ahmed@example.com",
      shipping_address: { name: "Ahmed Ali", phone: "+201001234567" },
      line_items: [
        { name: "Nike T-Shirt", quantity: 2, price: "725.00" },
        { title: "Socks", quantity: 1, price: "50.00" },
      ],
      subtotal_price: "1500.00",
      total_shipping_price_set: { shop_money: { amount: "0.00" } },
      total_price: "1450.00",
      currency: "EGP",
    });

    expect(normalized).toEqual({
      externalOrderId: "5551234",
      orderNumber: "1042",
      customer: { name: "Ahmed Ali", phone: "+201001234567", email: "ahmed@example.com" },
      items: [
        { name: "Nike T-Shirt", quantity: 2, price: 725 },
        { name: "Socks", quantity: 1, price: 50 },
      ],
      subtotal: 1500,
      shipping: 0,
      total: 1450,
      currency: "EGP",
    });
  });

  it("rejects a payload with no stable order id instead of silently coercing it", () => {
    expect(() =>
      provider.normalizeOrder({
        name: "#1042",
        line_items: [],
        subtotal_price: "0",
        total_price: "0",
        currency: "EGP",
      })
    ).toThrow(/missing a stable order id/);
  });

  it("falls back to the customer's name when no address name is present", () => {
    const normalized = provider.normalizeOrder({
      id: 1,
      name: "#1",
      customer: { first_name: "Sara", last_name: "Ibrahim" },
      phone: "+201009999999",
      line_items: [],
      subtotal_price: "0",
      total_price: "0",
      currency: "EGP",
    });

    expect(normalized.customer.name).toBe("Sara Ibrahim");
  });
});

describe("WooCommerceProvider.normalizeOrder", () => {
  const provider = new WooCommerceProvider();

  it("rejects a payload with no stable order id instead of silently coercing it", () => {
    expect(() =>
      provider.normalizeOrder({
        number: "88",
        line_items: [],
        total: "0",
        currency: "EGP",
      })
    ).toThrow(/missing a stable order id/);
  });

  it("maps a WooCommerce order payload into the internal order shape", () => {
    const normalized = provider.normalizeOrder({
      id: 88,
      number: "88",
      billing: { first_name: "Layla", last_name: "Hassan", phone: "+201234567890", email: "layla@example.com" },
      line_items: [{ name: "Bag", quantity: 1, price: "300.00" }],
      total: "320.00",
      shipping_total: "20.00",
      currency: "EGP",
    });

    expect(normalized).toEqual({
      externalOrderId: "88",
      orderNumber: "88",
      customer: { name: "Layla Hassan", phone: "+201234567890", email: "layla@example.com" },
      items: [{ name: "Bag", quantity: 1, price: 300 }],
      subtotal: 300,
      shipping: 20,
      total: 320,
      currency: "EGP",
    });
  });
});
