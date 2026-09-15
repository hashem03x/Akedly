export type PlanId = "starter" | "growth" | "scale";

export const pricingPlans: { id: PlanId; featured: boolean }[] = [
  { id: "starter", featured: false },
  { id: "growth", featured: true },
  { id: "scale", featured: false },
];
