import { useTranslations } from "next-intl";
import { Badge } from "./ui/Badge";
import type { ConfirmationStatus } from "@/lib/api-types";

const TONE: Record<ConfirmationStatus, "neutral" | "success" | "danger" | "warning"> = {
  pending: "warning",
  confirmed: "success",
  cancelled: "danger",
  expired: "neutral",
};

export function StatusBadge({ status }: { status: ConfirmationStatus }) {
  const t = useTranslations("Orders.status");
  return <Badge tone={TONE[status]}>{t(status)}</Badge>;
}
