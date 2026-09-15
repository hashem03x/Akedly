import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { integrationItems } from "@/config/integrations";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";

export function Integrations({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section id="integrations" className="scroll-mt-16 py-20 sm:py-28">
      <Container>
        <SectionHeading heading={dict.integrations.heading} sub={dict.integrations.sub} />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrationItems.map((integration, index) => {
            const Icon = integration.icon;
            const copy = dict.integrations.items[integration.id];
            const live = integration.status === "live";

            return (
              <Reveal key={integration.id} delay={(index % 3) * 90}>
                <Card
                  className={cn(
                    "flex h-full flex-col p-6 transition-colors duration-200",
                    live ? "hover:border-border-strong hover:bg-elevated" : "opacity-70",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-hover text-ink">
                      <Icon className="size-5" />
                    </span>
                    <Badge tone={live ? "accent" : "muted"}>
                      {live ? dict.common.live : dict.common.comingSoon}
                    </Badge>
                  </div>

                  <h3 className="mt-5 text-base font-semibold text-ink">{copy.name}</h3>
                  <p className="mt-2 flex-1 text-sm text-muted">{copy.description}</p>

                  {live ? (
                    <Link
                      href={`/${locale}/register`}
                      className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink transition-colors hover:text-accent"
                    >
                      {dict.integrations.connect}
                      <ArrowRight className="size-3.5 rtl:-scale-x-100" />
                    </Link>
                  ) : (
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted">
                      {dict.common.comingSoon}
                    </span>
                  )}
                </Card>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
