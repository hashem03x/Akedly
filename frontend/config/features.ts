import {
  MessageCircle,
  RotateCcw,
  CreditCard,
  Truck,
  Store,
  BarChart3,
  Settings2,
  History,
  type LucideIcon,
} from "lucide-react";

export type FeatureId =
  | "whatsapp"
  | "cancellation"
  | "prepaid"
  | "courier"
  | "multiStore"
  | "analytics"
  | "automationRules"
  | "customerHistory";

export const featureItems: { id: FeatureId; icon: LucideIcon }[] = [
  { id: "whatsapp", icon: MessageCircle },
  { id: "cancellation", icon: RotateCcw },
  { id: "prepaid", icon: CreditCard },
  { id: "courier", icon: Truck },
  { id: "multiStore", icon: Store },
  { id: "analytics", icon: BarChart3 },
  { id: "automationRules", icon: Settings2 },
  { id: "customerHistory", icon: History },
];
