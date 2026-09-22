import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerMerchant } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const merchant = await getServerMerchant();
  if (!merchant) redirect(`/${locale}/login`);
  if (!merchant.onboardingCompleted) redirect(`/${locale}/onboarding`);

  return <DashboardShell merchantName={merchant.name}>{children}</DashboardShell>;
}
