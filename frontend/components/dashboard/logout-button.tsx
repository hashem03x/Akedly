"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { logoutMerchant } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LogoutButton({
  locale,
  label,
  loadingLabel,
  variant = "ghost",
  className,
}: {
  locale: Locale;
  label: string;
  loadingLabel: string;
  variant?: "primary" | "secondary" | "ghost" | "outline";
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await logoutMerchant();
    } catch {
      // Even if this request fails, redirect anyway — trapping the user on
      // a broken logout button is worse than a stale cookie that the next
      // protected-route check will reject regardless.
    } finally {
      router.push(`/${locale}`);
      router.refresh();
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      onClick={handleLogout}
      disabled={loading}
      className={cn("gap-2", className)}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      {loading ? loadingLabel : label}
    </Button>
  );
}
