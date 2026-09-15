import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Hero } from "@/components/sections/hero";
import { TrustStrip } from "@/components/sections/trust-strip";
import { Problem } from "@/components/sections/problem";
import { HowItWorks } from "@/components/sections/how-it-works";
import { DashboardPreview } from "@/components/sections/dashboard-preview";
import { Features } from "@/components/sections/features";
import { Integrations } from "@/components/sections/integrations";
import { Analytics } from "@/components/sections/analytics";
import { PricingSection } from "@/components/sections/pricing-section";
import { Faq } from "@/components/sections/faq";
import { FinalCta } from "@/components/sections/final-cta";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <>
      <Hero locale={locale} dict={dict} />
      <TrustStrip dict={dict} />
      <Problem dict={dict} />
      <HowItWorks dict={dict} />
      <DashboardPreview locale={locale} dict={dict} />
      <Features dict={dict} />
      <Integrations locale={locale} dict={dict} />
      <Analytics dict={dict} />
      <PricingSection locale={locale} dict={dict} />
      <Faq dict={dict} />
      <FinalCta locale={locale} dict={dict} />
    </>
  );
}
