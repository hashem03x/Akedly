"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { SidebarNav } from "./Sidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function DashboardShell({
  children,
  merchantName,
}: {
  children: ReactNode;
  merchantName: string;
}) {
  const locale = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center justify-between border-b border-border px-4 md:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <Link href={`/${locale}/dashboard`} className="font-semibold">
            Akedly
          </Link>
        </div>
        <LanguageSwitcher />
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-72 border-e border-border bg-bg p-4">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-semibold">Akedly</span>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border"
              >
                ×
              </button>
            </div>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-e border-border p-4 md:flex md:flex-col">
          <div className="mb-8 flex items-center justify-between">
            <Link href={`/${locale}/dashboard`} className="text-lg font-semibold tracking-tight">
              Akedly
            </Link>
          </div>
          <div className="flex-1">
            <SidebarNav />
          </div>
          <div className="border-t border-border pt-4">
            <p className="truncate text-sm text-muted">{merchantName}</p>
            <div className="mt-3">
              <LanguageSwitcher />
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
