import { ArrowRight } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";
import { WorkflowVisual } from "@/components/sections/workflow-visual";

function splitLastWord(text: string) {
  const parts = text.trim().split(" ");
  const last = parts.pop() ?? "";
  return { rest: parts.join(" "), last };
}

export function Hero({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const headline = splitLastWord(dict.hero.headline);

  return (
    <section className="relative overflow-hidden pt-16 pb-8 sm:pt-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(60%_50%_at_50%_0%,var(--color-accent-soft),transparent_70%)]"
      />
      <Container className="flex flex-col items-center text-center">
        <Reveal>
          <Badge tone="accent">{dict.hero.eyebrow}</Badge>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl md:text-6xl">
            {headline.rest}{" "}
            <span className="text-accent drop-shadow-[0_0_28px_var(--color-accent-glow)]">
              {headline.last}
            </span>
          </h1>
        </Reveal>

        <Reveal delay={140}>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted sm:text-xl">
            {dict.hero.sub}
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Button href={`/${locale}/register`} size="lg">
              {dict.hero.ctaPrimary}
              <ArrowRight className="size-4 rtl:-scale-x-100" />
            </Button>
            <Button href={`/${locale}#how-it-works`} variant="secondary" size="lg">
              {dict.hero.ctaSecondary}
            </Button>
          </div>
        </Reveal>

        <WorkflowVisual dict={dict} />
      </Container>
    </section>
  );
}
