import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { ConnectShopifyOAuthButton } from "@/components/stores/ConnectStoreForms";

export default async function ConnectShopifyPage() {
  const t = await getTranslations("Onboarding.shopify");

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-1.5 text-sm text-muted">{t("oauthExplain")}</p>
      <Card className="mt-6 p-6">
        <ConnectShopifyOAuthButton />
        <p className="mt-4 text-xs text-muted">{t("oauthRedirectNote")}</p>
      </Card>
    </div>
  );
}
