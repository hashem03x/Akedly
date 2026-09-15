import { Check } from "lucide-react";
import { pricingPlans } from "@/config/pricing";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";

export function PricingSection({
  locale,
  dict,
  showHeading = true,
}: {
  locale: Locale;
  dict: Dictionary;
  showHeading?: boolean;
}) {
  return (
    <section id="pricing" className="scroll-mt-16 py-20 sm:py-28">
      <Container>
        {showHeading ? (
          <SectionHeading heading={dict.pricing.heading} sub={dict.pricing.sub} />
        ) : null}

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {pricingPlans.map((plan, index) => {
            const copy = dict.pricing.plans[plan.id];
            return (
              <Reveal key={plan.id} delay={index * 100}>
                <Card
                  className={cn(
                    "flex h-full flex-col p-6 sm:p-8",
                    plan.featured
                      ? "border-accent/50 shadow-[0_0_0_1px_rgba(34,197,94,0.08),0_30px_80px_-30px_var(--color-accent-glow)]"
                      : "hover:border-border-strong",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-ink">{copy.name}</h3>
                    {plan.featured ? <Badge tone="accent">{dict.pricing.mostPopular}</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm text-muted">{copy.description}</p>

                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold tracking-tight text-ink">
                      {dict.pricing.priceComingSoon}
                    </span>
                  </div>

                  <Button
                    href={`/${locale}/register`}
                    variant={plan.featured ? "primary" : "secondary"}
                    className="mt-6 w-full"
                  >
                    {dict.pricing.cta}
                  </Button>

                  <ul className="mt-8 space-y-3 border-t border-border pt-6">
                    {copy.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm text-ink">
                        <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
