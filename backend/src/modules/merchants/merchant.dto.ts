import type { MerchantDocument } from "./merchant.model";

export function toMerchantDto(merchant: MerchantDocument) {
  return {
    id: merchant.id,
    name: merchant.name,
    email: merchant.email,
    plan: merchant.plan,
    onboardingCompleted: merchant.onboardingCompleted,
    createdAt: merchant.createdAt,
  };
}
