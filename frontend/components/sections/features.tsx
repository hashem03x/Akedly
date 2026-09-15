import { featureItems } from "@/config/features";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";

export function Features({ dict }: { dict: Dictionary }) {
  return (
    <section id="features" className="scroll-mt-16 py-20 sm:py-28">
      <Container>
        <SectionHeading heading={dict.features.heading} sub={dict.features.sub} />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featureItems.map((feature, index) => {
            const Icon = feature.icon;
            const copy = dict.features.items[feature.id];
            return (
              <Reveal key={feature.id} delay={(index % 4) * 90}>
                <Card className="h-full p-6 transition-colors duration-200 hover:border-border-strong hover:bg-elevated">
                  <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-hover text-ink">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-base font-semibold text-ink">{copy.title}</h3>
                  <p className="mt-2 text-sm text-muted">{copy.description}</p>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
