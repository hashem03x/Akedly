import Link from "next/link";
import { siteConfig } from "@/config/site";
import type { Locale } from "@/lib/i18n/config";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export function AuthNavbar({ locale }: { locale: Locale }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-5 sm:px-6 lg:hidden">
      <Link href={`/${locale}`} className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-on-accent">
          A
        </span>
        {locale === "ar" ? siteConfig.nameAr : siteConfig.name}
      </Link>
      <LanguageSwitcher locale={locale} />
    </header>
  );
}
