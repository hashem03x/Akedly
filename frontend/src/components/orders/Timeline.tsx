import { useLocale, useTranslations } from "next-intl";
import type { CommunicationEvent } from "@/lib/api-types";

function eventKey(event: CommunicationEvent): string {
  if (event.type === "confirmation_response") return `confirmation_response_${event.status}`;
  if (event.type === "store_synced" && event.status === "failed") return "store_sync_failed";
  return event.type;
}

export function Timeline({ events }: { events: CommunicationEvent[] }) {
  const t = useTranslations("Orders.events");
  const locale = useLocale();

  if (events.length === 0) return null;

  const formatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    timeStyle: "short",
    dateStyle: "medium",
  });

  return (
    <ol className="space-y-4">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3">
          <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <div>
            <p className="text-sm text-ink">{t(eventKey(event))}</p>
            <p className="mt-0.5 text-xs text-muted ltr-nums">{formatter.format(new Date(event.createdAt))}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
