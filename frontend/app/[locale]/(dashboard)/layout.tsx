import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getCurrentMerchantServer } from "@/lib/api/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

// Server-side auth gate: runs on every request to any /dashboard/* route,
// including a hard refresh, so there's no client-side flash of protected
// content and no stale client state to get out of sync with the cookie.
export default async function DashboardLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);

  const cookieHeader = (await cookies()).toString();
  const result = await getCurrentMerchantServer(cookieHeader);

  if (!result) {
    redirect(`/${locale}/login`);
  }

  return (
    <DashboardShell locale={locale} dict={dict} merchant={result.merchant}>
      {children}
    </DashboardShell>
  );
}
