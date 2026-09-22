import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { ConnectShopifyForm } from "@/components/stores/ConnectStoreForms";

export default async function ConnectShopifyPage() {
  const t = await getTranslations("Onboarding.shopify");

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
      <Card className="mt-6 p-6">
        <ConnectShopifyForm />
      </Card>
    </div>
  );
}
