"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api-client";
import { ApiClientError, type Store } from "@/lib/api-types";

export function ConnectShopifyForm() {
  const t = useTranslations("Onboarding.shopify");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch<{ store: Store }>("/api/v1/stores/shopify", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          domain: form.get("domain"),
          accessToken: form.get("accessToken"),
        }),
      });
      router.push(`/${locale}/dashboard/stores`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Input name="name" label={t("storeName")} required />
      <Input name="domain" label={t("domain")} placeholder={t("domainHint")} required />
      <Input name="accessToken" label={t("accessToken")} type="password" required />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={submitting} className="mt-2">
        {t("submit")}
      </Button>
    </form>
  );
}

export function ConnectWooCommerceForm() {
  const t = useTranslations("Onboarding.woocommerce");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch<{ store: Store }>("/api/v1/stores/woocommerce", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          domain: form.get("domain"),
          consumerKey: form.get("consumerKey"),
          consumerSecret: form.get("consumerSecret"),
        }),
      });
      router.push(`/${locale}/dashboard/stores`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Input name="name" label={t("storeName")} required />
      <Input name="domain" label={t("domain")} placeholder={t("domainHint")} required />
      <Input name="consumerKey" label={t("consumerKey")} required />
      <Input name="consumerSecret" label={t("consumerSecret")} type="password" required />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={submitting} className="mt-2">
        {t("submit")}
      </Button>
    </form>
  );
}
