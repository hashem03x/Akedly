import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { Accordion } from "@/components/ui/accordion";

export function Faq({ dict }: { dict: Dictionary }) {
  return (
    <section id="faq" className="scroll-mt-16 py-20 sm:py-28">
      <Container className="max-w-3xl">
        <SectionHeading heading={dict.faq.heading} sub={dict.faq.sub} />
        <Reveal delay={100} className="mt-12">
          <Accordion items={[...dict.faq.items]} />
        </Reveal>
      </Container>
    </section>
  );
}
