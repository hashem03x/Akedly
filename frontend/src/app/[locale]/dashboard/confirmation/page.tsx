import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { apiFetchServer } from "@/lib/api-server";
import { StoreSettingsForm } from "@/components/settings/StoreSettingsForm";
import type { Store } from "@/lib/api-types";

export default async function ConfirmationSettingsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations("Settings");
  const tStores = await getTranslations("Stores");
  const { stores } = await apiFetchServer<{ stores: Store[] }>("/api/v1/stores");

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>

      {stores.length === 0 ? (
        <p className="mt-10 rounded-md border border-border px-4 py-10 text-center text-sm text-muted">
          {tStores("empty")}{" "}
          <Link href={`/${locale}/dashboard/stores`} className="text-accent hover:underline">
            {tStores("connectShopify")}
          </Link>
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <StoreSettingsForm key={store.id} store={store} />
          ))}
        </div>
      )}
    </div>
  );
}
