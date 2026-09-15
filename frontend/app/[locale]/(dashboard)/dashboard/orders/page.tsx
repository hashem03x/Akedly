import { cookies } from "next/headers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getOrdersServer } from "@/lib/api/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/dashboard/orders">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.appDashboard.orders.title };
}

const STATUS_TONE = {
  PENDING_CONFIRMATION: "info",
  CONFIRMED: "accent",
  CANCELLED: "danger",
  EXPIRED: "muted",
} as const;

export default async function DashboardOrdersPage({ params }: PageProps<"/[locale]/dashboard/orders">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const c = dict.appDashboard.orders;

  const cookieHeader = (await cookies()).toString();
  const result = await getOrdersServer(cookieHeader);
  const orders = result?.orders ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{c.title}</h1>

      <Card className="overflow-x-auto">
        {orders.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">{c.empty}</p>
        ) : (
          <table className="w-full min-w-[640px] text-start text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs font-medium uppercase tracking-wide text-muted">
                <th className="px-5 py-3 text-start">{c.table.order}</th>
                <th className="px-5 py-3 text-start">{c.table.customer}</th>
                <th className="px-5 py-3 text-start">{c.table.amount}</th>
                <th className="px-5 py-3 text-start">{c.table.status}</th>
                <th className="px-5 py-3 text-start">{c.table.created}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-5 py-3 font-medium text-ink">#{order.shopifyOrderNumber}</td>
                  <td className="px-5 py-3 text-muted">{order.customer.name}</td>
                  <td className="px-5 py-3 text-ink">
                    {order.total} {order.currency}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS_TONE[order.status as keyof typeof STATUS_TONE] ?? "neutral"}>
                      {c.statusLabels[order.status as keyof typeof c.statusLabels] ?? order.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {new Date(order.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
