import Link from "next/link";
import { Check } from "lucide-react";
import { siteConfig } from "@/config/site";
import type { Locale } from "@/lib/i18n/config";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export function AuthShell({
  locale,
  title,
  sub,
  highlights,
  copyright,
  children,
}: {
  locale: Locale;
  title: string;
  sub: string;
  highlights: string[];
  copyright: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden border-e border-border bg-bg-secondary px-12 py-16 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_20%_100%,var(--color-accent-glow),transparent_60%)]"
        />
        <div className="relative flex items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center gap-2 text-lg font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-on-accent">
              A
            </span>
            {locale === "ar" ? siteConfig.nameAr : siteConfig.name}
          </Link>
          <LanguageSwitcher locale={locale} className="border-white/15 bg-white/10" />
        </div>

        <div className="relative">
          <h2 className="max-w-sm text-balance text-3xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-4 max-w-sm text-balance text-white/60">{sub}</p>
          <ul className="mt-8 space-y-3">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-white/80">
                <span className="flex size-5 items-center justify-center rounded-full bg-accent/20 text-accent">
                  <Check className="size-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">{copyright}</p>
      </div>

      <div className="flex items-center justify-center px-5 py-16 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:text-start">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
            <p className="mt-2 text-sm text-muted">{sub}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
