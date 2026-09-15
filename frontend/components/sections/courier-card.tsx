import { CheckCircle2, Truck } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Card } from "@/components/ui/card";

export function CourierCard({ dict }: { dict: Dictionary }) {
  const c = dict.howItWorks.courierCard;

  const checklist = [c.confirmed, c.paymentReady, c.shipmentCreated];

  return (
    <Card className="w-full max-w-sm p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55)]">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-xs text-muted">{c.orderLabel}</p>
          <p className="text-sm font-semibold text-ink">#10482</p>
        </div>
        <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Truck className="size-4" />
        </span>
      </div>

      <ul className="space-y-2.5">
        {checklist.map((item) => (
          <li key={item} className="flex items-center gap-2.5 text-sm text-ink">
            <CheckCircle2 className="size-4 shrink-0 text-accent" />
            {item}
          </li>
        ))}
      </ul>

      <div className="mt-4 space-y-2 rounded-xl bg-elevated p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted">{c.courierLabel}</span>
          <span className="font-medium text-ink">Bosta</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">{c.trackingLabel}</span>
          <span className="font-mono text-xs font-medium text-ink">BST-77291</span>
        </div>
      </div>
    </Card>
  );
}
