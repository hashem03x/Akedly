import request from "supertest";
import { createApp } from "../src/app";
import { Customer } from "../src/models/customer.model";
import { Order } from "../src/models/order.model";
import { AUTH_COOKIE_NAME } from "../src/utils/cookies";
import { extractCookie } from "./helpers/cookies";
import { clearTestDB, connectTestDB, disconnectTestDB } from "./helpers/db";

const app = createApp();

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

async function registerMerchant(email: string) {
  const response = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Merchant", email, password: "correct-horse-battery" });
  return { cookie: extractCookie(response, AUTH_COOKIE_NAME), merchantId: response.body.data.merchant.id as string };
}

describe("GET /api/v1/orders/:id — tenant isolation", () => {
  it("a merchant cannot fetch another merchant's order by ID", async () => {
    const merchantA = await registerMerchant("owner-a@example.com");
    const merchantB = await registerMerchant("owner-b@example.com");

    const customer = await Customer.create({ merchantId: merchantA.merchantId, name: "Cust", phone: "+201111111111" });
    const order = await Order.create({
      merchantId: merchantA.merchantId,
      customerId: customer._id,
      shopifyOrderId: "1",
      shopifyOrderNumber: "#1",
      customer: { name: "Cust", phone: "+201111111111" },
      subtotal: 100,
      total: 100,
      currency: "EGP",
    });

    const asOwner = await request(app).get(`/api/v1/orders/${order.id}`).set("Cookie", merchantA.cookie);
    expect(asOwner.status).toBe(200);
    expect(asOwner.body.data.order.id).toBe(order.id);

    const asOther = await request(app).get(`/api/v1/orders/${order.id}`).set("Cookie", merchantB.cookie);
    expect(asOther.status).toBe(404);
    expect(asOther.body.error.code).toBe("ORDER_NOT_FOUND");
  });

  it("a merchant's order list never includes another merchant's orders", async () => {
    const merchantA = await registerMerchant("list-a@example.com");
    const merchantB = await registerMerchant("list-b@example.com");

    const customerA = await Customer.create({ merchantId: merchantA.merchantId, name: "A", phone: "+201111111111" });
    const customerB = await Customer.create({ merchantId: merchantB.merchantId, name: "B", phone: "+202222222222" });

    await Order.create({
      merchantId: merchantA.merchantId,
      customerId: customerA._id,
      shopifyOrderId: "a1",
      shopifyOrderNumber: "#A1",
      customer: { name: "A", phone: "+201111111111" },
      subtotal: 100,
      total: 100,
      currency: "EGP",
    });
    await Order.create({
      merchantId: merchantB.merchantId,
      customerId: customerB._id,
      shopifyOrderId: "b1",
      shopifyOrderNumber: "#B1",
      customer: { name: "B", phone: "+202222222222" },
      subtotal: 200,
      total: 200,
      currency: "EGP",
    });

    const response = await request(app).get("/api/v1/orders").set("Cookie", merchantA.cookie);

    expect(response.status).toBe(200);
    expect(response.body.data.total).toBe(1);
    expect(response.body.data.orders).toHaveLength(1);
    expect(response.body.data.orders[0].shopifyOrderId).toBe("a1");
  });

  it("rejects an unauthenticated request outright", async () => {
    const response = await request(app).get("/api/v1/orders");
    expect(response.status).toBe(401);
  });
});
