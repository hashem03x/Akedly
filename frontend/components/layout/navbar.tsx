"use client";
import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { siteConfig } from "@/config/site";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { PublicMerchant } from "@/lib/api/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { LogoutButton } from "@/components/dashboard/logout-button";
import logo from "@/public/logos/logo.png";
import Image from "next/image";
export function Navbar({
  locale,
  dict,
  currentMerchant,
}: {
  locale: Locale;
  dict: Dictionary;
  currentMerchant?: PublicMerchant | null;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const navLabels: Record<string, string> = {
    product: dict.nav.product,
    howItWorks: dict.nav.howItWorks,
    integrations: dict.nav.integrations,
    pricing: dict.nav.pricing,
    faq: dict.nav.faq,
  };

  return (
    <Fragment>
      <header
        className={cn(
          "sticky top-0 z-50 border-b border-white/6 bg-bg/75 backdrop-blur-md transition-shadow duration-300",
          scrolled &&
            "shadow-[0_1px_0_0_rgba(255,255,255,0.06),0_12px_30px_-20px_rgba(0,0,0,0.6)]",
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-on-accent">
              <Image src={logo} alt="Logo" width={120} height={40} />{" "}
            </span>
            {locale === "ar" ? siteConfig.nameAr : siteConfig.name}
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {siteConfig.navLinks.map((link) => (
              <Link
                key={link.id}
                href={`/${locale}${link.href}`}
                className="text-sm font-medium text-muted transition-colors hover:text-ink"
              >
                {navLabels[link.id]}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <LanguageSwitcher locale={locale} />
            {currentMerchant ? (
              <>
                <Button href={`/${locale}/dashboard`} variant="secondary" size="sm">
                  {dict.nav.dashboard}
                </Button>
                <LogoutButton locale={locale} label={dict.appDashboard.logout} loadingLabel={dict.appDashboard.loggingOut} />
              </>
            ) : (
              <>
                <Button href={`/${locale}/login`} variant="ghost" size="sm">
                  {dict.nav.login}
                </Button>
                <Button href={`/${locale}/register`} size="sm">
                  {dict.nav.getStarted}
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            aria-label="Menu"
            onClick={() => setOpen(true)}
            className="flex size-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-elevated md:hidden"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
      />

      <div
        className={cn(
          "fixed inset-y-0 end-0 z-50 flex w-[85%] max-w-sm flex-col gap-6 border-s border-border bg-bg-secondary p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] transition-transform duration-300 md:hidden",
          "ltr:translate-x-full rtl:-translate-x-full",
          open && "!translate-x-0",
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">
            {locale === "ar" ? siteConfig.nameAr : siteConfig.name}
          </span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="flex size-10 items-center justify-center rounded-full border border-border hover:bg-elevated"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {siteConfig.navLinks.map((link) => (
            <Link
              key={link.id}
              href={`/${locale}${link.href}`}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-base font-medium text-ink hover:bg-elevated"
            >
              {navLabels[link.id]}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <LanguageSwitcher locale={locale} className="self-start" />
          {currentMerchant ? (
            <>
              <Button href={`/${locale}/dashboard`} variant="secondary" onClick={() => setOpen(false)}>
                {dict.nav.dashboard}
              </Button>
              <LogoutButton
                locale={locale}
                label={dict.appDashboard.logout}
                loadingLabel={dict.appDashboard.loggingOut}
                variant="outline"
                className="w-full"
              />
            </>
          ) : (
            <>
              <Button href={`/${locale}/login`} variant="secondary">
                {dict.nav.login}
              </Button>
              <Button href={`/${locale}/register`}>{dict.nav.getStarted}</Button>
            </>
          )}
        </div>
      </div>
    </Fragment>
  );
}
