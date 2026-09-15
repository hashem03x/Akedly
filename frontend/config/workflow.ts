import {
  PackageSearch,
  MessageCircle,
  RotateCcw,
  Wallet,
  Truck,
  type LucideIcon,
} from "lucide-react";

export type WorkflowStepId =
  | "order"
  | "whatsapp"
  | "cancellation"
  | "prepaid"
  | "courier";

export const workflowSteps: { id: WorkflowStepId; icon: LucideIcon }[] = [
  { id: "order", icon: PackageSearch },
  { id: "whatsapp", icon: MessageCircle },
  { id: "cancellation", icon: RotateCcw },
  { id: "prepaid", icon: Wallet },
  { id: "courier", icon: Truck },
];
