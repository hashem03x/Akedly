import { z } from "zod";
import { STORE_PLATFORMS } from "./store.model";

export const connectShopifyStoreSchema = z.object({
  name: z.string().trim().min(1).max(120),
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+\.myshopify\.com$/, "Enter a valid myshopify.com domain."),
  accessToken: z.string().trim().min(10, "Enter a valid Shopify access token."),
});

export const connectWooCommerceStoreSchema = z.object({
  name: z.string().trim().min(1).max(120),
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .min(4)
    .max(255)
    .transform((v) => v.replace(/^https?:\/\//, "").replace(/\/+$/, "")),
  consumerKey: z.string().trim().min(4, "Enter a valid consumer key."),
  consumerSecret: z.string().trim().min(4, "Enter a valid consumer secret."),
});

export const updateStoreSettingsSchema = z.object({
  autoConfirmationEnabled: z.boolean().optional(),
  confirmationChannel: z.enum(["whatsapp"]).optional(),
  messageLanguage: z.enum(["ar", "en"]).optional(),
});

export const platformParamSchema = z.object({
  platform: z.enum(STORE_PLATFORMS),
});
