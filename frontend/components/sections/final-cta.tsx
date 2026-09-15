import { ArrowRight } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { siteConfig } from "@/config/site";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

export function FinalCta({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-bg-secondary px-6 py-16 text-center sm:px-12 sm:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--color-accent-glow),transparent_55%)]"
            />
            <h2 className="relative text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {dict.finalCta.heading}
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-balance text-lg text-muted">
              {dict.finalCta.sub}
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button href={`/${locale}/register`} size="lg">
                {dict.finalCta.ctaPrimary}
                <ArrowRight className="size-4 rtl:-scale-x-100" />
              </Button>
              <Button href={`mailto:${siteConfig.contactEmail}`} variant="ghost" size="lg">
                {dict.finalCta.ctaSecondary}
              </Button>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
