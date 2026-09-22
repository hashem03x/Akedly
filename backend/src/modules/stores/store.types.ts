import type { z } from "zod";
import type { connectWooCommerceStoreSchema, updateStoreSettingsSchema } from "./store.validation";

export type ConnectWooCommerceInput = z.infer<typeof connectWooCommerceStoreSchema>;
export type UpdateStoreSettingsInput = z.infer<typeof updateStoreSettingsSchema>;
