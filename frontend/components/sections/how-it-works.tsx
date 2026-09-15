import { workflowSteps } from "@/config/workflow";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { OrderReceivedCard } from "@/components/sections/order-received-card";
import { WhatsappCard } from "@/components/sections/whatsapp-card";
import { CancellationCard } from "@/components/sections/cancellation-card";
import { PrepaidCard } from "@/components/sections/prepaid-card";
import { CourierCard } from "@/components/sections/courier-card";

const visuals: Record<string, React.ComponentType<{ dict: Dictionary }>> = {
  order: OrderReceivedCard,
  whatsapp: WhatsappCard,
  cancellation: CancellationCard,
  prepaid: PrepaidCard,
  courier: CourierCard,
};

export function HowItWorks({ dict }: { dict: Dictionary }) {
  return (
    <section id="how-it-works" className="scroll-mt-16 py-20 sm:py-28">
      <Container>
        <SectionHeading heading={dict.howItWorks.heading} sub={dict.howItWorks.sub} />

        <div className="mt-16 space-y-16 sm:space-y-24">
          {workflowSteps.map((step, index) => {
            const stepDict = dict.howItWorks.steps[step.id as keyof typeof dict.howItWorks.steps];
            const Icon = step.icon;
            const Visual = visuals[step.id];
            const reversed = index % 2 === 1;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col items-center gap-10 lg:flex-row lg:gap-16",
                  reversed && "lg:flex-row-reverse",
                )}
              >
                <Reveal className="w-full max-w-lg lg:w-1/2">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm text-border-strong">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="inline-flex size-11 items-center justify-center rounded-xl border border-border bg-elevated text-ink">
                      <Icon className="size-5" />
                    </span>
                  </div>
                  <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-accent">
                    {stepDict.step}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                    {stepDict.title}
                  </h3>
                  <p className="mt-3 text-lg text-muted">{stepDict.body}</p>
                </Reveal>

                <Reveal
                  delay={120}
                  className="flex w-full justify-center lg:w-1/2"
                >
                  {Visual ? <Visual dict={dict} /> : null}
                </Reveal>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
