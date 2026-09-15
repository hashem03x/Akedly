import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().min(1, "Email is required").email("Invalid email address"),
  // bcrypt silently ignores bytes beyond 72 — cap here so that's never a surprise.
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  // Collected by the marketing site's registration form; not required by
  // the auth flow itself, so optional here too.
  businessName: z.string().trim().max(150).optional(),
  phone: z.string().trim().max(30).optional(),
  platform: z.enum(["shopify", "woocommerce", "custom", "other"]).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
