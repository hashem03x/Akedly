import { CheckCircle2, XCircle, Wallet, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { analyticsStats, cancellationReasons } from "@/config/analytics-demo";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { Counter } from "@/components/ui/counter";

const statIcons: Record<string, LucideIcon> = {
  confirmationRate: CheckCircle2,
  cancellationRate: XCircle,
  prepaidConversion: Wallet,
  failedDelivery: TriangleAlert,
};

const statTone: Record<string, string> = {
  confirmationRate: "text-accent",
  cancellationRate: "text-danger",
  prepaidConversion: "text-accent",
  failedDelivery: "text-warning",
};

export function Analytics({ dict }: { dict: Dictionary }) {
  const maxReason = Math.max(...cancellationReasons.map((r) => r.value));

  return (
    <section className="py-20 sm:py-28">
      <Container>
        <SectionHeading heading={dict.analytics.heading} sub={dict.analytics.sub} />

        <div className="mt-14 grid gap-6 lg:grid-cols-5">
          <div className="grid grid-cols-2 gap-4 lg:col-span-3 lg:grid-cols-2">
            {analyticsStats.map((stat, index) => {
              const Icon = statIcons[stat.id];
              return (
                <Reveal key={stat.id} delay={index * 90}>
                  <Card className="h-full p-6">
                    <Icon className={cn("size-5", statTone[stat.id])} />
                    <p className="mt-4 text-3xl font-semibold tracking-tight text-ink">
                      <Counter value={stat.value} suffix="%" decimals={1} />
                    </p>
                    <p className="mt-1.5 text-sm text-muted">{dict.analytics.stats[stat.id]}</p>
                  </Card>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={120} className="lg:col-span-2">
            <Card className="h-full p-6">
              <h3 className="text-sm font-semibold text-ink">{dict.analytics.reasonsTitle}</h3>
              <div className="mt-6 space-y-4">
                {cancellationReasons.map((reason) => (
                  <div key={reason.id}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="text-ink">{dict.analytics.reasons[reason.id]}</span>
                      <span className="font-medium text-muted">{reason.value}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-secondary">
                      <div
                        className="h-full rounded-full bg-ink/80"
                        style={{ width: `${(reason.value / maxReason) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>
        </div>

        <p className="mt-6 text-center text-xs text-muted">{dict.analytics.demoNote}</p>
      </Container>
    </section>
  );
}
