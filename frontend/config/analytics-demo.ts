export const analyticsStats: {
  id: "confirmationRate" | "cancellationRate" | "prepaidConversion" | "failedDelivery";
  value: number;
}[] = [
  { id: "confirmationRate", value: 87.4 },
  { id: "cancellationRate", value: 8.2 },
  { id: "prepaidConversion", value: 14.7 },
  { id: "failedDelivery", value: 6.3 },
];

export const cancellationReasons: {
  id: "shippingCost" | "changedMind" | "price" | "deliveryTime" | "other";
  value: number;
}[] = [
  { id: "shippingCost", value: 34 },
  { id: "changedMind", value: 27 },
  { id: "price", value: 18 },
  { id: "deliveryTime", value: 12 },
  { id: "other", value: 9 },
];
