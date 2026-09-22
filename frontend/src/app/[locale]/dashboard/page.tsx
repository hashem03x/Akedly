import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { apiFetchServer } from "@/lib/api-server";
import { MetricCard } from "@/components/MetricCard";
import { OrdersTable } from "@/components/orders/OrdersTable";
import type { Order, OverviewMetrics, Store } from "@/lib/api-types";

export default async function OverviewPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations("Overview");

  const [{ metrics }, { orders }, { stores }] = await Promise.all([
    apiFetchServer<{ metrics: OverviewMetrics }>("/api/v1/orders/overview"),
    apiFetchServer<{ orders: Order[] }>("/api/v1/orders?pageSize=8"),
    apiFetchServer<{ stores: Store[] }>("/api/v1/stores"),
  ]);

  const storeNameById = Object.fromEntries(stores.map((s) => [s.id, s.name]));

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard label={t("ordersToday")} value={metrics.ordersToday} />
        <MetricCard label={t("pending")} value={metrics.pending} />
        <MetricCard label={t("confirmed")} value={metrics.confirmed} />
        <MetricCard label={t("cancelled")} value={metrics.cancelled} />
        <MetricCard label={t("confirmationRate")} value={`${metrics.confirmationRate}%`} />
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-medium">{t("recentOrders")}</h2>
          <Link href={`/${locale}/dashboard/orders`} className="text-sm text-muted hover:text-ink">
            {t("viewAll")}
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted">
            {t("empty")}
          </p>
        ) : (
          <OrdersTable orders={orders} storeNameById={storeNameById} />
        )}
      </div>
    </div>
  );
}
