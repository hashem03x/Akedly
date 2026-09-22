import { getTranslations } from "next-intl/server";
import { apiFetchServer } from "@/lib/api-server";
import { Card } from "@/components/ui/Card";
import { ActivityFeed, type ActivityEvent } from "@/components/ActivityFeed";

export default async function ActivityPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations("Activity");
  const { activity } = await apiFetchServer<{ activity: ActivityEvent[] }>(
    "/api/v1/communications?limit=100"
  );

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>

      <Card className="mt-6 p-5">
        {activity.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">{t("empty")}</p>
        ) : (
          <ActivityFeed events={activity} locale={locale} />
        )}
      </Card>
    </div>
  );
}
