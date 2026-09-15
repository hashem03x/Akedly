import { integrationItems, heroIntegrationIds } from "@/config/integrations";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

export function TrustStrip({ dict }: { dict: Dictionary }) {
  const items = heroIntegrationIds
    .map((id) => integrationItems.find((item) => item.id === id))
    .filter(Boolean) as typeof integrationItems;

  return (
    <section className="py-12 sm:py-16">
      <Container>
        <Reveal className="flex flex-col items-center gap-8">
          <p className="text-sm font-medium text-muted">{dict.trustStrip.heading}</p>
          <div className="flex w-full flex-wrap items-center justify-center gap-x-10 gap-y-6 sm:gap-x-14">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2 text-muted grayscale transition-all duration-200 hover:text-ink hover:grayscale-0"
                >
                  <Icon className="size-5" />
                  <span className="text-base font-semibold">
                    {dict.integrations.items[item.id].name}
                  </span>
                </div>
              );
            })}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
