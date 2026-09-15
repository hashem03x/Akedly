import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { PricingSection } from "@/components/sections/pricing-section";
import { Faq } from "@/components/sections/faq";
import { FinalCta } from "@/components/sections/final-cta";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/pricing">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.pricing.heading,
    description: dict.pricing.sub,
  };
}

export default async function PricingPage({ params }: PageProps<"/[locale]/pricing">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <>
      <div className="pt-16 pb-4 sm:pt-24">
        <Container>
          <Reveal className="mx-auto max-w-2xl text-center">
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              {dict.pricing.heading}
            </h1>
            <p className="mt-4 text-balance text-lg text-muted">{dict.pricing.sub}</p>
          </Reveal>
        </Container>
      </div>
      <PricingSection locale={locale} dict={dict} showHeading={false} />
      <Faq dict={dict} />
      <FinalCta locale={locale} dict={dict} />
    </>
  );
}
