"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api-client";
import { API_URL } from "@/lib/config";
import { ApiClientError, type Store } from "@/lib/api-types";

const SHOP_DOMAIN_REGEX = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

function normalizeShopDomain(raw: string): string | null {
  const trimmed = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  return SHOP_DOMAIN_REGEX.test(trimmed) ? trimmed : null;
}

/**
 * Starts the Shopify OAuth flow. The merchant never sees or enters an access
 * token — this only collects the shop domain, then navigates the browser
 * (full page load, not fetch) to the backend, which redirects to Shopify.
 */
export function ConnectShopifyOAuthButton() {
  const t = useTranslations("Onboarding.shopify");
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const shop = normalizeShopDomain(domain);
    if (!shop) {
      setError(t("domainInvalid"));
      return;
    }
    setError(null);
    window.location.href = `${API_URL}/api/v1/integrations/shopify/oauth/start?shop=${encodeURIComponent(shop)}`;
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Input
        name="domain"
        label={t("domain")}
        placeholder={t("domainHint")}
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        required
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="mt-2">
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
