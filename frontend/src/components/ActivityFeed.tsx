import Link from "next/link";
import { useTranslations } from "next-intl";

export interface ActivityEvent {
  id: string;
  orderId: string;
  orderNumber: string | null;
  customerName: string | null;
  channel: "system" | "whatsapp" | "phone";
  direction: "outbound" | "inbound";
  type: string;
  status: string;
  createdAt: string;
}

function eventKey(event: ActivityEvent): string {
  if (event.type === "confirmation_response") return `confirmation_response_${event.status}`;
  if (event.type === "store_synced" && event.status === "failed") return "store_sync_failed";
  return event.type;
}

export function ActivityFeed({ events, locale }: { events: ActivityEvent[]; locale: string }) {
  const t = useTranslations("Orders.events");
  const formatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <ul className="divide-y divide-border">
      {events.map((event) => (
        <li key={event.id} className="flex items-center justify-between gap-4 py-3 text-sm">
          <div>
            <p className="text-ink">{t(eventKey(event))}</p>
            <p className="mt-0.5 text-muted">
              {event.orderNumber ? (
                <Link
                  href={`/${locale}/dashboard/orders/${event.orderId}`}
                  className="hover:text-ink hover:underline"
                >
                  #{event.orderNumber}
                </Link>
              ) : (
                "—"
              )}
              {event.customerName ? ` · ${event.customerName}` : ""}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted ltr-nums">
            {formatter.format(new Date(event.createdAt))}
          </span>
        </li>
      ))}
    </ul>
  );
}
