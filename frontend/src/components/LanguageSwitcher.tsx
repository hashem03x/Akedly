"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { locales } from "@/i18n";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: string) {
    const segments = pathname.split("/");
    segments[1] = next;
    router.push(segments.join("/") || "/");
  }

  return (
    <div className="inline-flex items-center rounded-md border border-border bg-surface p-0.5 text-sm">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          className={`rounded-sm px-2.5 py-1 transition-colors ${
            l === locale ? "bg-surface-hover text-ink" : "text-muted hover:text-ink"
          }`}
        >
          {l === "ar" ? "عربي" : "EN"}
        </button>
      ))}
    </div>
  );
}
