import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { apiFetchServer } from "@/lib/api-server";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { clsx } from "@/lib/clsx";
import type { ConfirmationStatus, Order, Store } from "@/lib/api-types";

const FILTERS: { key: string; status?: ConfirmationStatus }[] = [
  { key: "all" },
  { key: "pending", status: "pending" },
  { key: "confirmed", status: "confirmed" },
  { key: "cancelled", status: "cancelled" },
];

export default async function OrdersPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { status?: string; search?: string; page?: string };
}) {
  const t = await getTranslations("Orders");
  const status = searchParams.status;
  const search = searchParams.search ?? "";
  const page = searchParams.page ?? "1";

  const query = new URLSearchParams({ page, pageSize: "20" });
  if (status) query.set("status", status);
  if (search) query.set("search", search);

  const [{ orders }, { stores }] = await Promise.all([
    apiFetchServer<{ orders: Order[] }>(`/api/v1/orders?${query.toString()}`),
    apiFetchServer<{ stores: Store[] }>("/api/v1/stores"),
  ]);
  const storeNameById = Object.fromEntries(stores.map((s) => [s.id, s.name]));

  function buildHref(next: Partial<{ status?: string; search: string }>) {
    const params = new URLSearchParams();
    const nextStatus = "status" in next ? next.status : status;
    const nextSearch = "search" in next ? next.search : search;
    if (nextStatus) params.set("status", nextStatus);
    if (nextSearch) params.set("search", nextSearch);
    const qs = params.toString();
    return `/${locale}/dashboard/orders${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-md border border-border bg-surface p-0.5 text-sm">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={buildHref({ status: f.status })}
              className={clsx(
                "rounded-sm px-3 py-1.5 transition-colors",
                status === f.status ? "bg-surface-hover text-ink" : "text-muted hover:text-ink"
              )}
            >
              {t(`filters.${f.key}`)}
            </Link>
          ))}
        </div>

        <form action={`/${locale}/dashboard/orders`} className="flex-1 sm:max-w-xs">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder={t("searchPlaceholder")}
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </form>
      </div>

      <div className="mt-6">
        <OrdersTable orders={orders} storeNameById={storeNameById} />
      </div>
    </div>
  );
}
