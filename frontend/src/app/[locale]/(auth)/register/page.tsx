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

export default function RegisterPage() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch<{ merchant: Merchant }>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      router.push(`/${locale}/onboarding`);
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
      <h1 className="text-2xl font-semibold tracking-tight">{t("register.title")}</h1>
      <p className="mt-1.5 text-sm text-muted">{t("register.subtitle")}</p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <Input
          label={t("fields.name")}
          name="name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
          autoComplete="new-password"
          required
          minLength={8}
          hint={t("fields.passwordHint")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={submitting} className="mt-2 w-full">
          {t("register.submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {t("register.switchPrompt")}{" "}
        <Link href={`/${locale}/login`} className="font-medium text-ink hover:text-accent">
          {t("register.switchLink")}
        </Link>
      </p>
    </div>
  );
}
