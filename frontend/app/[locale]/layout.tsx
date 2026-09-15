import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { locales, isLocale, dirOf } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { fontEn, fontAr } from "@/lib/fonts";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#08090a",
};

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);

  return {
    metadataBase: new URL("https://akedly.com"),

    title: {
      default: dict.meta.title,
      template: `%s — Akedly`,
    },

    description: dict.meta.description,

    icons: {
      icon: "logos/logo.png",
      shortcut: "logos/logo.png",
      apple: "logos/logo.png",
    },

    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        ar: "/ar",
      },
    },

    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      locale: locale === "ar" ? "ar_EG" : "en_US",
      type: "website",
    },

    twitter: {
      card: "summary_large_image",
      title: dict.meta.title,
      description: dict.meta.description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html
      lang={locale}
      dir={dirOf(locale)}
      className={`${fontEn.variable} ${fontAr.variable}`}
    >
      <body className="flex min-h-screen flex-col bg-bg text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
