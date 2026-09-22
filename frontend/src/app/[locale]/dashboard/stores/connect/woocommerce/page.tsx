import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { ConnectWooCommerceForm } from "@/components/stores/ConnectStoreForms";

export default async function ConnectWooCommercePage() {
  const t = await getTranslations("Onboarding.woocommerce");

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
      <Card className="mt-6 p-6">
        <ConnectWooCommerceForm />
      </Card>
    </div>
  );
}
