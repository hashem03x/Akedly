"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useAuthSession } from "@/hooks/useAuthSession";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { ConnectShopifyOAuthButton } from "@/components/stores/ConnectStoreForms";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/api-client";
import { ApiClientError, type Store, type StorePlatform } from "@/lib/api-types";

type Step = "platform" | "connect" | "test" | "configure" | "done";

export default function OnboardingPage() {
  const t = useTranslations("Onboarding");
  const locale = useLocale();
  const router = useRouter();
  const { merchant, loading } = useAuthSession();

  const [step, setStep] = useState<Step>("platform");
  const [platform, setPlatform] = useState<StorePlatform | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [autoConfirm, setAutoConfirm] = useState(true);
  const [language, setLanguage] = useState<"ar" | "en">(locale === "ar" ? "ar" : "en");

  useEffect(() => {
    if (!loading && !merchant) router.replace(`/${locale}/login`);
  }, [loading, merchant, router, locale]);

  if (loading || !merchant) return null;

  const steps = [
    t("steps.platform"),
    t("steps.connect"),
    t("steps.test"),
    t("steps.configure"),
    t("steps.done"),
  ];
  const stepIndex = { platform: 0, connect: 1, test: 2, configure: 3, done: 4 }[step];

  async function connectWooCommerce(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      const data = await apiFetch<{ store: Store }>("/api/v1/stores/woocommerce", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          domain: form.get("domain"),
          consumerKey: form.get("consumerKey"),
          consumerSecret: form.get("consumerSecret"),
        }),
      });
      setStore(data.store);
      setStep("test");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("test.failure"));
    } finally {
      setSubmitting(false);
    }
  }

  async function retestConnection() {
    if (!store) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await apiFetch<{ store: Store }>(`/api/v1/stores/${store.id}/test-connection`, {
        method: "POST",
      });
      setStore(data.store);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("test.failure"));
    } finally {
      setSubmitting(false);
    }
  }

  async function saveConfiguration() {
    if (!store) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/stores/${store.id}/settings`, {
        method: "PATCH",
        body: JSON.stringify({
          autoConfirmationEnabled: autoConfirm,
          confirmationChannel: "whatsapp",
          messageLanguage: language,
        }),
      });
      await apiFetch("/api/v1/merchants/onboarding-complete", { method: "POST" });
      setStep("done");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("test.failure"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <h1 className="text-xl font-semibold tracking-tight">{t("welcome.title")}</h1>
      <p className="mt-1 text-sm text-muted">{t("welcome.subtitle")}</p>

      <div className="mt-8">
        <StepIndicator steps={steps} currentIndex={stepIndex} />
      </div>

      <Card className="mt-8 p-6">
        {step === "platform" && (
          <div>
            <h2 className="text-base font-medium">{t("platform.title")}</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => {
                  setPlatform("shopify");
                  setStep("connect");
                }}
                className="rounded-md border border-border p-4 text-left hover:border-accent hover:bg-surface-hover"
              >
                <div className="font-medium">{t("platform.shopify")}</div>
                <div className="mt-1 text-sm text-muted">{t("platform.shopifyHint")}</div>
              </button>
              <button
                onClick={() => {
                  setPlatform("woocommerce");
                  setStep("connect");
                }}
                className="rounded-md border border-border p-4 text-left hover:border-accent hover:bg-surface-hover"
              >
                <div className="font-medium">{t("platform.woocommerce")}</div>
                <div className="mt-1 text-sm text-muted">{t("platform.woocommerceHint")}</div>
              </button>
            </div>
          </div>
        )}

        {step === "connect" && platform === "shopify" && (
          <div>
            <h2 className="text-base font-medium">{t("shopify.title")}</h2>
            <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-muted">
              <li>{t("shopify.explain1")}</li>
              <li>{t("shopify.explain2")}</li>
              <li>{t("shopify.explain3")}</li>
            </ol>
            <div className="mt-5">
              <ConnectShopifyOAuthButton />
            </div>
            <p className="mt-4 text-xs text-muted">{t("shopify.oauthRedirectNote")}</p>
            <div className="mt-6">
              <Button type="button" variant="ghost" onClick={() => setStep("platform")}>
                {t("back")}
              </Button>
            </div>
          </div>
        )}

        {step === "connect" && platform === "woocommerce" && (
          <form onSubmit={connectWooCommerce}>
            <h2 className="text-base font-medium">{t("woocommerce.title")}</h2>
            <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-muted">
              <li>{t("woocommerce.explain1")}</li>
              <li>{t("woocommerce.explain2")}</li>
              <li>{t("woocommerce.explain3")}</li>
            </ol>
            <div className="mt-5 flex flex-col gap-4">
              <Input name="name" label={t("woocommerce.storeName")} required />
              <Input
                name="domain"
                label={t("woocommerce.domain")}
                placeholder={t("woocommerce.domainHint")}
                required
              />
              <Input name="consumerKey" label={t("woocommerce.consumerKey")} required />
              <Input name="consumerSecret" label={t("woocommerce.consumerSecret")} type="password" required />
            </div>
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
            <div className="mt-6 flex items-center justify-between">
              <Button type="button" variant="ghost" onClick={() => setStep("platform")}>
                {t("back")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {t("woocommerce.submit")}
              </Button>
            </div>
          </form>
        )}

        {step === "test" && store && (
          <div>
            <h2 className="text-base font-medium">{t("test.title")}</h2>
            <p className="mt-1 text-sm text-muted">{t("test.subtitle")}</p>

            <div className="mt-5 rounded-md border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{store.name}</span>
                <span
                  className={store.status === "connected" ? "text-sm text-success" : "text-sm text-danger"}
                >
                  {store.status === "connected" ? t("test.success") : t("test.failure")}
                </span>
              </div>
              {store.lastConnectionError && (
                <p className="mt-2 text-sm text-danger">{store.lastConnectionError}</p>
              )}
            </div>

            {error && <p className="mt-3 text-sm text-danger">{error}</p>}

            <div className="mt-6 flex items-center justify-between">
              <Button type="button" variant="ghost" onClick={retestConnection} disabled={submitting}>
                {t("test.retry")}
              </Button>
              <Button
                type="button"
                onClick={() => setStep("configure")}
                disabled={store.status !== "connected"}
              >
                {t("test.continue")}
              </Button>
            </div>
          </div>
        )}

        {step === "configure" && (
          <div>
            <h2 className="text-base font-medium">{t("configure.title")}</h2>

            <div className="mt-5 flex items-center justify-between rounded-md border border-border p-4">
              <span className="text-sm font-medium">{t("configure.autoConfirm")}</span>
              <button
                type="button"
                onClick={() => setAutoConfirm((v) => !v)}
                className={`h-6 w-11 rounded-full transition-colors ${
                  autoConfirm ? "bg-accent" : "bg-surface-hover"
                }`}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                    autoConfirm ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            <div className="mt-4">
              <span className="text-sm font-medium">{t("configure.language")}</span>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage("ar")}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                    language === "ar" ? "border-accent text-accent" : "border-border text-muted"
                  }`}
                >
                  {t("configure.arabic")}
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                    language === "en" ? "border-accent text-accent" : "border-border text-muted"
                  }`}
                >
                  {t("configure.english")}
                </button>
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-danger">{error}</p>}

            <div className="mt-6 flex justify-end">
              <Button onClick={saveConfiguration} disabled={submitting}>
                {t("configure.continue")}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="text-center">
            <h2 className="text-lg font-medium">{t("done.title")}</h2>
            <p className="mt-2 text-sm text-muted">{t("done.subtitle")}</p>
            <Button className="mt-6" onClick={() => router.push(`/${locale}/dashboard`)}>
              {t("done.cta")}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
