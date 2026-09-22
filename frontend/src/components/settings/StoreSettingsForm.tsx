"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api-client";
import { ApiClientError, type Store } from "@/lib/api-types";

export function StoreSettingsForm({ store }: { store: Store }) {
  const t = useTranslations("Settings");
  const [autoConfirm, setAutoConfirm] = useState(store.settings.autoConfirmationEnabled);
  const [language, setLanguage] = useState(store.settings.messageLanguage);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiFetch(`/api/v1/stores/${store.id}/settings`, {
        method: "PATCH",
        body: JSON.stringify({
          autoConfirmationEnabled: autoConfirm,
          confirmationChannel: "whatsapp",
          messageLanguage: language,
        }),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <p className="font-medium">{store.name}</p>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm font-medium">{t("autoConfirm")}</span>
        <button
          type="button"
          onClick={() => setAutoConfirm((v) => !v)}
          className={`h-6 w-11 rounded-full transition-colors ${autoConfirm ? "bg-accent" : "bg-surface-hover"}`}
        >
          <span
            className={`block h-5 w-5 rounded-full bg-white transition-transform ${
              autoConfirm ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      <p className="mt-1 text-sm text-muted">{t("autoConfirmHint")}</p>

      <div className="mt-5">
        <span className="text-sm font-medium">{t("channel")}</span>
        <div className="mt-2 flex flex-col gap-2">
          <div className="rounded-md border border-accent bg-accent/5 px-3 py-2 text-sm text-ink">
            {t("channelWhatsapp")}
          </div>
          <div className="rounded-md border border-border px-3 py-2 text-sm text-muted">
            {t("channelPhoneSoon")}
          </div>
          <div className="rounded-md border border-border px-3 py-2 text-sm text-muted">
            {t("channelBothSoon")}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <span className="text-sm font-medium">{t("language")}</span>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setLanguage("ar")}
            className={`flex-1 rounded-md border px-3 py-2 text-sm ${
              language === "ar" ? "border-accent text-accent" : "border-border text-muted"
            }`}
          >
            {t("arabic")}
          </button>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`flex-1 rounded-md border px-3 py-2 text-sm ${
              language === "en" ? "border-accent text-accent" : "border-border text-muted"
            }`}
          >
            {t("english")}
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {saved && <p className="mt-3 text-sm text-success">{t("saved")}</p>}

      <Button className="mt-5" onClick={save} disabled={saving}>
        {t("save")}
      </Button>
    </Card>
  );
}
