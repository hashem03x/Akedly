import { useTranslations } from "next-intl";

export function ShopifyOAuthBanner({
  status,
  shop,
}: {
  status: "connected" | "error" | null;
  shop?: string;
}) {
  const t = useTranslations("Stores.oauth");

  if (!status) return null;

  if (status === "connected") {
    return (
      <div className="mb-6 rounded-md border border-success/30 bg-success/10 p-4">
        <p className="text-sm font-medium text-success">{t("connectedTitle")}</p>
        {shop && <p className="mt-1 text-sm text-ink">{shop}</p>}
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-md border border-danger/30 bg-danger/10 p-4">
      <p className="text-sm font-medium text-danger">{t("errorTitle")}</p>
      <p className="mt-1 text-sm text-muted">{t("errorBody")}</p>
    </div>
  );
}
