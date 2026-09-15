import { PackageSearch, ShoppingBag, ShoppingCart, Globe } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const sources = [
  { icon: ShoppingBag, key: "shopify" as const },
  { icon: ShoppingCart, key: "woocommerce" as const },
  { icon: Globe, key: "custom" as const },
];

export function OrderReceivedCard({ dict }: { dict: Dictionary }) {
  return (
    <Card className="w-full max-w-sm p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-info-soft text-info">
            <PackageSearch className="size-3.5" />
          </span>
          <p className="text-sm font-medium text-ink">#10482</p>
        </div>
        <Badge tone="info">{dict.common.live}</Badge>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-elevated p-3">
        <div>
          <p className="text-sm font-semibold text-ink">Ahmed Ali</p>
          <p className="text-xs text-muted">1,250 {dict.common.egp}</p>
        </div>
        <span className="text-xs font-medium text-warning">{dict.dashboard.status.pending}</span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        {sources.map((source) => {
          const Icon = source.icon;
          return (
            <div key={source.key} className="flex flex-col items-center gap-1.5 text-muted">
              <span className="flex size-9 items-center justify-center rounded-full border border-border">
                <Icon className="size-4" />
              </span>
              <span className="text-[11px]">{dict.dashboard.source[source.key]}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
