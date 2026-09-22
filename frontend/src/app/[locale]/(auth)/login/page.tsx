"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api-client";
import { ApiClientError, type Merchant } from "@/lib/api-types";
import { translateAuthError } from "@/lib/translate-error";

export default function LoginPage() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const data = await apiFetch<{ merchant: Merchant }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push(data.merchant.onboardingCompleted ? `/${locale}/dashboard` : `/${locale}/onboarding`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(translateAuthError(t, err.code, err.message));
      } else {
        setError(t("errors.UNKNOWN_ERROR"));
      }
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{t("login.title")}</h1>
      <p className="mt-1.5 text-sm text-muted">{t("login.subtitle")}</p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <Input
          label={t("fields.email")}
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label={t("fields.password")}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={submitting} className="mt-2 w-full">
          {t("login.submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {t("login.switchPrompt")}{" "}
        <Link href={`/${locale}/register`} className="font-medium text-ink hover:text-accent">
          {t("login.switchLink")}
        </Link>
      </p>
    </div>
  );
}
