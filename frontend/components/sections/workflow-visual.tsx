import { Fragment } from "react";
import {
  ArrowRight,
  PackageSearch,
  MessageCircle,
  CheckCircle2,
  Wallet,
  Truck,
} from "lucide-react";
import { integrationItems, heroIntegrationIds } from "@/config/integrations";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";
import { Card } from "@/components/ui/card";

const heroFlowSteps = [
  { id: "newOrder", icon: PackageSearch },
  { id: "whatsapp", icon: MessageCircle },
  { id: "confirmed", icon: CheckCircle2 },
  { id: "prepaid", icon: Wallet },
  { id: "courier", icon: Truck },
] as const;

export function WorkflowVisual({ dict }: { dict: Dictionary }) {
  const heroIntegrations = heroIntegrationIds
    .map((id) => integrationItems.find((item) => item.id === id))
    .filter(Boolean) as typeof integrationItems;

  return (
    <Reveal delay={200} className="mt-16">
      <Card className="overflow-hidden bg-surface p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_30px_80px_-30px_rgba(0,0,0,0.55)] sm:p-6">
        <div className="flex items-center justify-between gap-2 border-b border-border pb-4">
          <p className="text-sm font-medium text-muted">{dict.hero.flowTitle}</p>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-danger/40" />
            <span className="size-2.5 rounded-full bg-warning/40" />
            <span className="size-2.5 rounded-full bg-accent/50" />
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-3 py-6 md:flex-row md:items-center md:justify-between md:gap-2">
          {heroFlowSteps.map((step, index) => {
            const Icon = step.icon;
            const label = dict.hero.flow[step.id];
            const isMilestone = step.id === "confirmed" || step.id === "courier";
            return (
              <Fragment key={step.id}>
                <Reveal
                  delay={index * 130}
                  className="flex items-center gap-3 md:flex-1 md:flex-col md:text-center"
                >
                  <div
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-xl border ring-1",
                      isMilestone
                        ? "border-accent/30 bg-accent-soft text-accent ring-accent/10"
                        : "border-border bg-elevated text-ink ring-white/[0.02]",
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <p className="text-sm font-medium text-ink">{label}</p>
                </Reveal>
                {index < heroFlowSteps.length - 1 ? (
                  <div className="hidden shrink-0 items-center justify-center text-border-strong md:flex">
                    <ArrowRight className="size-4 rtl:-scale-x-100" />
                  </div>
                ) : null}
              </Fragment>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {dict.hero.worksWith}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {heroIntegrations.map((item) => {
              const Icon = item.icon;
              const name = dict.integrations.items[item.id].name;
              return (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-elevated px-3 py-1 text-xs font-medium text-muted"
                >
                  <Icon className="size-3.5" />
                  {name}
                </span>
              );
            })}
          </div>
        </div>
      </Card>
    </Reveal>
  );
}
