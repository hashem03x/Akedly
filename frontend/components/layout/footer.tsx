import Link from "next/link";
import { AtSign, Briefcase, Camera } from "lucide-react";
import { siteConfig } from "@/config/site";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Container } from "@/components/ui/container";

const socialIcons = { twitter: AtSign, linkedin: Briefcase, instagram: Camera };

export function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const productLinks = [
    { id: "product", href: "#product" },
    { id: "howItWorks", href: "#how-it-works" },
    { id: "integrations", href: "#integrations" },
    { id: "pricing", href: "#pricing" },
    { id: "faq", href: "#faq" },
  ] as const;

  const legalLinks = [
    { id: "privacy", href: "/privacy" },
    { id: "terms", href: "/terms" },
  ] as const;

  return (
    <footer className="border-t border-border-subtle bg-footer-bg">
      <Container className="grid grid-cols-2 gap-10 py-16 sm:grid-cols-4 lg:grid-cols-12">
        <div className="col-span-2 sm:col-span-4 lg:col-span-5">
          <Link href={`/${locale}`} className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-on-accent">
              A
            </span>
            {locale === "ar" ? siteConfig.nameAr : siteConfig.name}
          </Link>
          <p className="mt-4 max-w-xs text-sm text-muted">{dict.footer.description}</p>
          <div className="mt-6 flex items-center gap-3">
            {siteConfig.social.map((item) => {
              const Icon = socialIcons[item.id];
              return (
                <a
                  key={item.id}
                  href={item.href}
                  aria-label={item.id}
                  className="flex size-9 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-border-strong hover:text-ink"
                >
                  <Icon className="size-4" />
                </a>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-3 lg:col-start-7">
          <p className="text-sm font-semibold text-ink">{dict.footer.productHeading}</p>
          <ul className="mt-4 space-y-3">
            {productLinks.map((link) => (
              <li key={link.id}>
                <Link
                  href={`/${locale}${link.href}`}
                  className="text-sm text-muted transition-colors hover:text-ink"
                >
                  {dict.footer.links[link.id]}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3">
          <p className="text-sm font-semibold text-ink">{dict.footer.legalHeading}</p>
          <ul className="mt-4 space-y-3">
            <li>
              <a
                href={`mailto:${siteConfig.contactEmail}`}
                className="text-sm text-muted transition-colors hover:text-ink"
              >
                {dict.footer.links.contact}
              </a>
            </li>
            {legalLinks.map((link) => (
              <li key={link.id}>
                <Link
                  href={`/${locale}${link.href}`}
                  className="text-sm text-muted transition-colors hover:text-ink"
                >
                  {dict.footer.links[link.id]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>

      <Container className="flex flex-col gap-2 border-t border-border-subtle py-6 text-sm text-subtle sm:flex-row sm:items-center sm:justify-between">
        <p>{dict.footer.copyright}</p>
      </Container>
    </footer>
  );
}
