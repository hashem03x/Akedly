import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { PublicMerchant } from "@/lib/api/auth";
import { siteConfig } from "@/config/site";
import { Container } from "@/components/ui/container";
import { LogoutButton } from "@/components/dashboard/logout-button";
import logo from "@/public/logos/logo.png";

export function DashboardShell({
  locale,
  dict,
  merchant,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  merchant: PublicMerchant;
  children: React.ReactNode;
}) {
  const navItems = [
    { href: `/${locale}/dashboard`, label: dict.appDashboard.nav.overview },
    { href: `/${locale}/dashboard/orders`, label: dict.appDashboard.nav.orders },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-bg-secondary">
        <Container className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href={`/${locale}/dashboard`}
              className="flex items-center gap-2 text-lg font-semibold tracking-tight"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-on-accent">
                <Image src={logo} alt="Logo" width={120} height={40} />
              </span>
              {locale === "ar" ? siteConfig.nameAr : siteConfig.name}
            </Link>
            <nav className="hidden items-center gap-6 sm:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-muted transition-colors hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted sm:inline">{merchant.name}</span>
            <LogoutButton
              locale={locale}
              label={dict.appDashboard.logout}
              loadingLabel={dict.appDashboard.loggingOut}
              variant="outline"
            />
          </div>
        </Container>

        <nav className="flex items-center gap-6 border-t border-border-subtle px-5 py-2 sm:hidden">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-medium text-muted hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1 bg-bg py-8">
        <Container>{children}</Container>
      </main>
    </div>
  );
}
