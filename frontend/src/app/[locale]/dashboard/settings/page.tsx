import { getTranslations } from "next-intl/server";
import { getServerMerchant } from "@/lib/session";
import { Card } from "@/components/ui/Card";

export default async function AccountSettingsPage() {
  const t = await getTranslations("Account");
  const merchant = await getServerMerchant();
  if (!merchant) return null;

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>

      <Card className="mt-6 max-w-md p-5">
        <dl className="space-y-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{t("name")}</dt>
            <dd className="font-medium">{merchant.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{t("email")}</dt>
            <dd className="font-medium">{merchant.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{t("plan")}</dt>
            <dd className="font-medium capitalize">{merchant.plan}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
