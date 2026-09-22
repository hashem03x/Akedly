import type { z } from "zod";
import type {
  connectShopifyStoreSchema,
  connectWooCommerceStoreSchema,
  updateStoreSettingsSchema,
} from "./store.validation";

export type ConnectShopifyInput = z.infer<typeof connectShopifyStoreSchema>;
export type ConnectWooCommerceInput = z.infer<typeof connectWooCommerceStoreSchema>;
export type UpdateStoreSettingsInput = z.infer<typeof updateStoreSettingsSchema>;
