import {
  PackageSearch,
  CheckCircle2,
  XCircle,
  Wallet,
  Truck,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { dashboardStats, dashboardOrders } from "@/config/dashboard-demo";
import { siteConfig } from "@/config/site";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { Counter } from "@/components/ui/counter";

const statIcons: Record<string, LucideIcon> = {
  ordersToday: PackageSearch,
  confirmationRate: CheckCircle2,
  cancellationRate: XCircle,
  prepaidOrders: Wallet,
  shipmentsCreated: Truck,
};

const statusTone: Record<string, string> = {
  confirmed: "bg-accent-soft text-accent",
  prepaid: "bg-info-soft text-info",
  cancelled: "bg-danger-soft text-danger",
  pending: "bg-warning-soft text-warning",
};

export function DashboardPreview({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section id="product" className="scroll-mt-16 py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow={dict.dashboard.eyebrow}
          heading={dict.dashboard.heading}
          sub={dict.dashboard.sub}
        />

        <Reveal delay={100} className="mt-14">
          <Card className="overflow-hidden bg-surface p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_40px_100px_-40px_rgba(0,0,0,0.6)] sm:p-4">
            <div className="flex items-center gap-2 px-2 py-2">
              <span className="size-2.5 rounded-full bg-danger/30" />
              <span className="size-2.5 rounded-full bg-warning/30" />
              <span className="size-2.5 rounded-full bg-accent/40" />
              <span className="ms-3 text-xs font-medium text-muted">
                {locale === "ar" ? siteConfig.nameAr : siteConfig.name} · Dashboard
              </span>
            </div>

            <div className="rounded-xl bg-bg-secondary p-3 sm:p-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {dashboardStats.map((stat) => {
                  const Icon = statIcons[stat.id];
                  return (
                    <div key={stat.id} className="rounded-xl border border-border bg-surface p-4">
                      <Icon className="size-4 text-muted" />
                      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">
                        <Counter value={stat.value} suffix={stat.suffix} decimals={stat.suffix ? 1 : 0} />
                      </p>
                      <p className="mt-1 text-xs text-muted">{dict.dashboard.stats[stat.id]}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                <div className="overflow-x-auto rounded-xl border border-border bg-surface lg:col-span-2">
                  <table className="w-full min-w-[560px] text-start text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted">
                        <th className="px-4 py-3 text-start font-medium">{dict.dashboard.table.order}</th>
                        <th className="px-4 py-3 text-start font-medium">{dict.dashboard.table.customer}</th>
                        <th className="px-4 py-3 text-start font-medium">{dict.dashboard.table.amount}</th>
                        <th className="px-4 py-3 text-start font-medium">{dict.dashboard.table.status}</th>
                        <th className="px-4 py-3 text-start font-medium">{dict.dashboard.table.source}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardOrders.map((order) => (
                        <tr key={order.orderNumber} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 font-medium text-ink">#{order.orderNumber}</td>
                          <td className="px-4 py-3 text-ink">{order.customer}</td>
                          <td className="px-4 py-3 text-ink">
                            {order.amount.toLocaleString("en-US")} {dict.common.egp}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                                statusTone[order.status],
                              )}
                            >
                              {dict.dashboard.status[order.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted">{dict.dashboard.source[order.source]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl border border-border bg-surface p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-accent-soft text-accent">
                      <MessageCircle className="size-3.5" />
                    </span>
                    <p className="text-sm font-medium text-ink">{dict.dashboard.activityTitle}</p>
                  </div>
                  <ul className="space-y-3">
                    {dict.dashboard.activity.map((item) => (
                      <li key={item} className="flex gap-2.5 text-sm text-muted">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          <p className="mt-4 text-center text-xs text-muted">{dict.dashboard.demoNote}</p>
        </Reveal>
      </Container>
    </section>
  );
}
