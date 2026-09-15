export type OrderStatus = "confirmed" | "prepaid" | "cancelled" | "pending";
export type OrderSource = "shopify" | "woocommerce" | "custom";

export const dashboardStats: {
  id: "ordersToday" | "confirmationRate" | "cancellationRate" | "prepaidOrders" | "shipmentsCreated";
  value: number;
  suffix?: string;
}[] = [
  { id: "ordersToday", value: 128 },
  { id: "confirmationRate", value: 87.4, suffix: "%" },
  { id: "cancellationRate", value: 8.2, suffix: "%" },
  { id: "prepaidOrders", value: 34 },
  { id: "shipmentsCreated", value: 96 },
];

export const dashboardOrders: {
  orderNumber: string;
  customer: string;
  amount: number;
  status: OrderStatus;
  source: OrderSource;
}[] = [
  { orderNumber: "10482", customer: "Ahmed Ali", amount: 1250, status: "confirmed", source: "shopify" },
  { orderNumber: "10481", customer: "Sara Mohamed", amount: 890, status: "prepaid", source: "shopify" },
  { orderNumber: "10480", customer: "Omar Hassan", amount: 2100, status: "cancelled", source: "woocommerce" },
  { orderNumber: "10479", customer: "Mona Youssef", amount: 540, status: "prepaid", source: "custom" },
  { orderNumber: "10478", customer: "Youssef Adel", amount: 1780, status: "confirmed", source: "woocommerce" },
];
