"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

function pathWithLocale(pathname: string, locale: Locale) {
  const segments = pathname.split("/");
  segments[1] = locale;
  return segments.join("/") || `/${locale}`;
}

export function LanguageSwitcher({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-bg-secondary p-0.5 text-sm font-medium",
        className,
      )}
    >
      {locales.map((l) => (
        <Link
          key={l}
          href={pathWithLocale(pathname, l)}
          aria-current={l === locale}
          onClick={() => {
            document.cookie = `NEXT_LOCALE=${l};path=/;max-age=31536000`;
          }}
          className={cn(
            "rounded-full px-2.5 py-1 uppercase transition-colors",
            l === locale ? "bg-accent text-on-accent" : "text-muted hover:text-ink",
          )}
        >
          {l}
        </Link>
      ))}
    </div>
  );
}
