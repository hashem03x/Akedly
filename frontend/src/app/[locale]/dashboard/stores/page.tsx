import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { apiFetchServer } from "@/lib/api-server";
import { StoreCard } from "@/components/stores/StoreCard";
import { ShopifyOAuthBanner } from "@/components/stores/ShopifyOAuthBanner";
import type { Store } from "@/lib/api-types";

export default async function StoresPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { shopify?: string; store?: string };
}) {
  const t = await getTranslations("Stores");
  const { stores } = await apiFetchServer<{ stores: Store[] }>("/api/v1/stores");

  const oauthStatus =
    searchParams.shopify === "connected" || searchParams.shopify === "error" ? searchParams.shopify : null;

  return (
    <div>
      <ShopifyOAuthBanner status={oauthStatus} shop={searchParams.store} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <div className="flex gap-2">
          <Link
            href={`/${locale}/dashboard/stores/connect/shopify`}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-hover"
          >
            {t("connectShopify")}
          </Link>
          <Link
            href={`/${locale}/dashboard/stores/connect/woocommerce`}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-hover"
          >
            {t("connectWooCommerce")}
          </Link>
        </div>
      </div>

      {stores.length === 0 ? (
        <p className="mt-10 rounded-md border border-border px-4 py-10 text-center text-sm text-muted">
          {t("empty")}
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      )}
    </div>
  );
}
