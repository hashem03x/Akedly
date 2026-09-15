import { Check, X } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";

export function Problem({ dict }: { dict: Dictionary }) {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <SectionHeading heading={dict.problem.heading} sub={dict.problem.sub} />

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <Reveal delay={80}>
            <Card className="h-full p-6 sm:p-8">
              <div className="mb-6 flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-danger-soft text-danger">
                  <X className="size-4" />
                </span>
                <h3 className="text-lg font-semibold text-ink">{dict.problem.withoutTitle}</h3>
              </div>

              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
                {dict.problem.manualLabel}
              </p>
              <ol className="mb-8 space-y-0">
                {dict.problem.manualSteps.map((step, index) => (
                  <li key={step} className="relative flex items-center gap-3 py-1.5 ps-1">
                    {index < dict.problem.manualSteps.length - 1 ? (
                      <span className="absolute start-[9px] top-6 h-[calc(100%-0.75rem)] w-px bg-border" />
                    ) : null}
                    <span className="relative z-10 flex size-[18px] shrink-0 items-center justify-center rounded-full border border-border bg-bg text-[10px] font-medium text-muted">
                      {index + 1}
                    </span>
                    <span className="text-sm text-muted">{step}</span>
                  </li>
                ))}
              </ol>

              <ul className="space-y-3 border-t border-border pt-6">
                {dict.problem.withoutItems.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <X className="mt-0.5 size-4 shrink-0 text-danger" />
                    <span className="text-sm text-ink">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>

          <Reveal delay={160}>
            <Card className="h-full border-accent/25 bg-accent-soft p-6 sm:p-8">
              <div className="mb-6 flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-accent text-on-accent">
                  <Check className="size-4" />
                </span>
                <h3 className="text-lg font-semibold text-ink">{dict.problem.withTitle}</h3>
              </div>

              <ol className="space-y-1">
                {dict.problem.withSteps.map((step, index) => (
                  <li
                    key={step}
                    className={cn(
                      "relative flex items-center gap-4 rounded-xl px-3 py-3.5",
                      index === dict.problem.withSteps.length - 1
                        ? "bg-accent text-on-accent"
                        : "bg-surface",
                    )}
                  >
                    {index < dict.problem.withSteps.length - 1 ? (
                      <span className="absolute start-[26px] top-full h-2 w-px bg-accent/30" />
                    ) : null}
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                        index === dict.problem.withSteps.length - 1
                          ? "bg-on-accent/10 text-on-accent"
                          : "bg-accent-soft text-accent",
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium">{step}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
