import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { StatusBadge } from "@/components/StatusBadge";
import type { Order } from "@/lib/api-types";

function formatMoney(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function formatTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function OrdersTable({ orders, storeNameById }: { orders: Order[]; storeNameById?: Record<string, string> }) {
  const t = useTranslations("Orders");
  const locale = useLocale();

  if (orders.length === 0) {
    return <p className="py-10 text-center text-sm text-muted">{t("empty")}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-start text-sm">
        <thead>
          <tr className="border-b border-border text-start text-muted">
            <th className="py-2 pe-4 font-medium">{t("table.order")}</th>
            <th className="py-2 pe-4 font-medium">{t("table.customer")}</th>
            <th className="py-2 pe-4 font-medium">{t("table.store")}</th>
            <th className="py-2 pe-4 font-medium">{t("table.total")}</th>
            <th className="py-2 pe-4 font-medium">{t("table.status")}</th>
            <th className="py-2 pe-4 font-medium">{t("table.channel")}</th>
            <th className="py-2 font-medium">{t("table.time")}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-border/60 last:border-0 hover:bg-surface-hover">
              <td className="py-3 pe-4">
                <Link
                  href={`/${locale}/dashboard/orders/${order.id}`}
                  className="font-medium text-ink hover:text-accent"
                >
                  #{order.orderNumber}
                </Link>
              </td>
              <td className="py-3 pe-4 text-ink">{order.customer.name}</td>
              <td className="py-3 pe-4 text-muted">{storeNameById?.[order.storeId] ?? "—"}</td>
              <td className="py-3 pe-4 ltr-nums">{formatMoney(order.total, order.currency, locale)}</td>
              <td className="py-3 pe-4">
                <StatusBadge status={order.confirmationStatus} />
              </td>
              <td className="py-3 pe-4 text-muted">{order.confirmationChannel ?? "—"}</td>
              <td className="py-3 text-muted">{formatTime(order.createdAt, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
