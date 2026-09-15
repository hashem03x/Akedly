import {
  ShoppingBag,
  ShoppingCart,
  MessageCircle,
  PackageCheck,
  Package,
  Plug,
  type LucideIcon,
} from "lucide-react";

export type IntegrationId =
  | "shopify"
  | "woocommerce"
  | "whatsapp"
  | "bosta"
  | "aramex"
  | "customApi";

export type IntegrationStatus = "live" | "comingSoon";

export const integrationItems: {
  id: IntegrationId;
  icon: LucideIcon;
  status: IntegrationStatus;
}[] = [
  { id: "shopify", icon: ShoppingBag, status: "live" },
  { id: "woocommerce", icon: ShoppingCart, status: "live" },
  { id: "whatsapp", icon: MessageCircle, status: "live" },
  { id: "bosta", icon: PackageCheck, status: "live" },
  { id: "aramex", icon: Package, status: "comingSoon" },
  { id: "customApi", icon: Plug, status: "live" },
];

/** Subset shown as small badges in the hero trust row. */
export const heroIntegrationIds: IntegrationId[] = [
  "shopify",
  "woocommerce",
  "whatsapp",
  "bosta",
  "aramex",
];
