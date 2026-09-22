"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api-client";
import { ApiClientError } from "@/lib/api-types";

export function OrderActions({ orderId }: { orderId: string }) {
  const t = useTranslations("Orders.detail");
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: string, path: string) {
    setPending(action);
    setError(null);
    try {
      await apiFetch(path, { method: "POST" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={pending !== null}
          onClick={() => run("resend", `/api/v1/confirmations/${orderId}/resend`)}
        >
          {t("resend")}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={pending !== null}
          onClick={() => run("confirm", `/api/v1/confirmations/${orderId}/confirm`)}
        >
          {t("markConfirmed")}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={pending !== null}
          onClick={() => run("cancel", `/api/v1/confirmations/${orderId}/cancel`)}
        >
          {t("markCancelled")}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
