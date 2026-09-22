"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { clsx } from "@/lib/clsx";
import { apiFetch } from "@/lib/api-client";

const ITEMS = [
  { key: "overview", href: "" },
  { key: "orders", href: "/orders" },
  { key: "stores", href: "/stores" },
  { key: "confirmation", href: "/confirmation" },
  { key: "activity", href: "/activity" },
  { key: "settings", href: "/settings" },
] as const;

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const base = `/${locale}/dashboard`;

  async function logout() {
    await apiFetch("/api/v1/auth/logout", { method: "POST" });
    router.push(`/${locale}/login`);
  }

  return (
    <div className="flex h-full flex-col justify-between">
      <nav className="flex flex-col gap-1">
        {ITEMS.map((item) => {
          const href = `${base}${item.href}`;
          const active = item.href === "" ? pathname === base : pathname.startsWith(href);
          return (
            <Link
              key={item.key}
              href={href}
              onClick={onNavigate}
              className={clsx(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-surface-hover text-ink" : "text-muted hover:bg-surface-hover hover:text-ink"
              )}
            >
              {t(item.key)}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={logout}
        className="rounded-md px-3 py-2 text-left text-sm font-medium text-muted hover:bg-surface-hover hover:text-ink"
      >
        {t("logout")}
      </button>
    </div>
  );
}
