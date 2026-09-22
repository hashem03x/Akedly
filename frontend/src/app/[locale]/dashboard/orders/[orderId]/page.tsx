import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { apiFetchServer } from "@/lib/api-server";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { Timeline } from "@/components/orders/Timeline";
import { OrderActions } from "@/components/orders/OrderActions";
import type { CommunicationEvent, Order, Store } from "@/lib/api-types";

export default async function OrderDetailPage({
  params: { locale, orderId },
}: {
  params: { locale: string; orderId: string };
}) {
  const t = await getTranslations("Orders.detail");
  const { order, timeline } = await apiFetchServer<{ order: Order; timeline: CommunicationEvent[] }>(
    `/api/v1/orders/${orderId}`
  );
  const { store } = await apiFetchServer<{ store: Store }>(`/api/v1/stores/${order.storeId}`);

  const money = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    style: "currency",
    currency: order.currency,
    maximumFractionDigits: 0,
  });

  return (
    <div>
      <Link href={`/${locale}/dashboard/orders`} className="text-sm text-muted hover:text-ink">
        ← {t("back")}
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">#{order.orderNumber}</h1>
        <StatusBadge status={order.confirmationStatus} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="text-sm font-medium text-muted">{t("customer")}</h2>
          <p className="mt-2 font-medium">{order.customer.name}</p>
          <p className="mt-1 text-sm text-muted ltr-nums">{order.customer.phone}</p>
          {order.customer.email && <p className="mt-1 text-sm text-muted">{order.customer.email}</p>}
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-medium text-muted">{t("items")}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>
                  <span className="ltr-nums">{item.quantity}×</span> {item.name}
                </span>
                <span className="ltr-nums text-muted">{money.format(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm font-medium">
            <span>{t("total")}</span>
            <span className="ltr-nums">{money.format(order.total)}</span>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-medium text-muted">{t("confirmation")}</h2>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted">{t("channel")}</span>
            <span>{order.confirmationChannel ?? t("noChannel")}</span>
          </div>
          <div className="mt-1.5 flex justify-between text-sm">
            <span className="text-muted">{t("store")}</span>
            <span>{store.name}</span>
          </div>

          {order.confirmationStatus === "pending" && (
            <div className="mt-4 border-t border-border pt-4">
              <OrderActions orderId={order.id} />
            </div>
          )}
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-base font-medium">{t("timeline")}</h2>
        <Card className="p-5">
          <Timeline events={timeline} />
        </Card>
      </div>
    </div>
  );
}
