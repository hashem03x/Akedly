import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { WhatsAppMock } from "@/components/WhatsAppMock";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default async function LandingPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations("Landing");
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="text-lg font-semibold tracking-tight">Akedly</span>
          <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
            <a href="#how-it-works" className="hover:text-ink">
              {t("nav.howItWorks")}
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link href={`/${locale}/login`} className="hidden text-sm text-muted hover:text-ink sm:block">
              {t("nav.login")}
            </Link>
            <Link
              href={`/${locale}/register`}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              {t("nav.getStarted")}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div>
            <p className="mb-4 text-sm font-medium uppercase tracking-wide text-accent">
              {t("hero.eyebrow")}
            </p>
            <h1 className="text-4xl font-semibold leading-[1.15] tracking-tight text-ink md:text-5xl">
              {t("hero.title")}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted md:text-lg">
              {t("hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={`/${locale}/register`}
                className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
              >
                {t("hero.ctaPrimary")}
              </Link>
              <a
                href="#how-it-works"
                className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-ink hover:bg-surface-hover"
              >
                {t("hero.ctaSecondary")}
              </a>
            </div>
            <p className="mt-8 text-xs uppercase tracking-wide text-muted">{t("logos")}</p>
            <div className="mt-3 flex gap-6 text-sm font-medium text-muted">
              <span>Shopify</span>
              <span>WooCommerce</span>
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
            <WhatsAppMock />
          </div>
        </section>

        <section id="how-it-works" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="text-2xl font-semibold tracking-tight">{t("howItWorks.title")}</h2>
            <p className="mt-2 text-muted">{t("howItWorks.subtitle")}</p>

            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {(["1", "2", "3", "4"] as const).map((n) => (
                <div key={n} className="border-t border-border pt-4">
                  <span className="text-sm font-medium text-accent">0{n}</span>
                  <h3 className="mt-2 font-medium text-ink">{t(`howItWorks.step${n}Title`)}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {t(`howItWorks.step${n}Body`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-surface/40">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="text-2xl font-semibold tracking-tight">{t("why.title")}</h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {(["1", "2", "3"] as const).map((n) => (
                <div key={n}>
                  <h3 className="font-medium text-ink">{t(`why.item${n}Title`)}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{t(`why.item${n}Body`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-16 sm:flex-row sm:items-center">
            <h2 className="max-w-xl text-2xl font-semibold tracking-tight">{t("cta.title")}</h2>
            <Link
              href={`/${locale}/register`}
              className="shrink-0 rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
            >
              {t("cta.button")}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center">
          <div>
            <span className="font-semibold">Akedly</span>
            <p className="mt-1 text-sm text-muted">{t("footer.tagline")}</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted">
            <a href="#how-it-works" className="hover:text-ink">
              {t("footer.howItWorks")}
            </a>
            <Link href={`/${locale}/login`} className="hover:text-ink">
              {t("footer.login")}
            </Link>
          </div>
          <p className="text-sm text-muted">{t("footer.legal", { year })}</p>
        </div>
      </footer>
    </div>
  );
}
