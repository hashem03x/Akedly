import { Wallet, CreditCard, Smartphone } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PrepaidCard({ dict }: { dict: Dictionary }) {
  const c = dict.howItWorks.prepaidCard;

  return (
    <Card className="w-full max-w-sm p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Wallet className="size-3.5" />
          </span>
          <p className="text-sm font-medium text-ink">{c.confirmedLabel}</p>
        </div>
        <Badge tone="accent">-5%</Badge>
      </div>

      <p className="mb-4 text-sm text-muted">{c.offer}</p>

      <div className="mb-4 flex items-end gap-2 rounded-xl bg-elevated px-4 py-3">
        <span className="text-sm text-subtle line-through">1,250</span>
        <span className="text-2xl font-semibold text-ink">1,187.50</span>
        <span className="mb-0.5 text-sm text-muted">{dict.common.egp}</span>
      </div>

      <button
        type="button"
        tabIndex={-1}
        className="w-full rounded-full bg-accent py-2.5 text-sm font-medium text-on-accent"
      >
        {c.payNow}
      </button>

      <div className="mt-4 flex items-center justify-center gap-3 text-muted">
        <CreditCard className="size-4" />
        <Smartphone className="size-4" />
        <Wallet className="size-4" />
        <span className="text-xs">{c.methods}</span>
      </div>
    </Card>
  );
}
