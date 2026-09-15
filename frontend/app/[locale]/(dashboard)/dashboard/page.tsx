import { cookies } from "next/headers";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getCurrentMerchantServer, getDashboardOverviewServer } from "@/lib/api/server";
import { Card } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/dashboard">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.appDashboard.overview.title };
}

export default async function DashboardOverviewPage({ params }: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const c = dict.appDashboard.overview;

  const cookieHeader = (await cookies()).toString();
  const [merchantResult, stats] = await Promise.all([
    getCurrentMerchantServer(cookieHeader),
    getDashboardOverviewServer(cookieHeader),
  ]);

  // The parent (dashboard) layout already redirects to /login when
  // unauthenticated — this is just satisfying the type, not a real guard.
  if (!merchantResult) redirect(`/${locale}/login`);

  const statCards: { label: string; value: number | string }[] = stats
    ? [
        { label: c.stats.totalOrders, value: stats.totalOrders },
        { label: c.stats.pendingConfirmation, value: stats.pendingConfirmation },
        { label: c.stats.confirmed, value: stats.confirmed },
        { label: c.stats.cancelled, value: stats.cancelled },
        { label: c.stats.expired, value: stats.expired },
        { label: c.stats.confirmationRate, value: `${stats.confirmationRate}%` },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{c.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {c.welcomeBack}, {merchantResult.merchant.name}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((stat) => (
          <Card key={stat.label} className="p-5">
            <p className="text-xs font-medium text-muted">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{stat.value}</p>
          </Card>
        ))}
      </div>

      {stats && stats.totalOrders === 0 && (
        <Card className="p-6 text-sm text-muted">{c.connectShopify}</Card>
      )}
    </div>
  );
}
