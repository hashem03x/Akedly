"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api-client";
import { ApiClientError, type Store } from "@/lib/api-types";

const STATUS_TONE = {
  connected: "success",
  disconnected: "neutral",
  error: "danger",
} as const;

export function StoreCard({ store }: { store: Store }) {
  const t = useTranslations("Stores");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function testConnection() {
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/stores/${store.id}/test-connection`, { method: "POST" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("title"));
    } finally {
      setPending(false);
    }
  }

  async function disconnect() {
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/stores/${store.id}/disconnect`, { method: "POST" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("title"));
    } finally {
      setPending(false);
      setConfirmingDisconnect(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{store.name}</p>
          <p className="mt-0.5 text-sm text-muted">
            {store.platform === "shopify" ? "Shopify" : "WooCommerce"} · {store.domain}
          </p>
        </div>
        <Badge tone={STATUS_TONE[store.status]}>{t(`status.${store.status}`)}</Badge>
      </div>

      {store.lastConnectionError && (
        <p className="mt-3 text-sm text-danger">{store.lastConnectionError}</p>
      )}
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {confirmingDisconnect ? (
        <div className="mt-4 rounded-md border border-danger/30 bg-danger/5 p-3">
          <p className="text-sm font-medium">{t("disconnectConfirmTitle")}</p>
          <p className="mt-1 text-sm text-muted">{t("disconnectConfirmBody")}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="destructive" disabled={pending} onClick={disconnect}>
              {t("confirmDisconnect")}
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirmingDisconnect(false)}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" disabled={pending} onClick={testConnection}>
            {t("testConnection")}
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirmingDisconnect(true)}>
            {t("disconnect")}
          </Button>
        </div>
      )}
    </Card>
  );
}
