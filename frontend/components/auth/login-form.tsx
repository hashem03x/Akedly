"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Button } from "@/components/ui/button";
import { FormField, inputClasses } from "@/components/auth/form-field";
import { ApiRequestError } from "@/lib/api/client";
import { loginMerchant } from "@/lib/api/auth";

export function LoginForm({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const c = dict.auth.login;
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus("submitting");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      await loginMerchant({ email, password });
      setStatus("success");
      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch (err) {
      setStatus("idle");
      if (err instanceof ApiRequestError) {
        if (err.code === "INVALID_CREDENTIALS") setError(c.errors.invalidCredentials);
        else if (err.code === "VALIDATION_ERROR") setError(c.errors.validation);
        else if (err.code === "NETWORK_ERROR") setError(c.errors.network);
        else setError(c.errors.generic);
      } else {
        setError(c.errors.generic);
      }
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-accent/20 bg-accent-soft px-6 py-10 text-center">
        <CheckCircle2 className="size-8 text-accent" />
        <p className="text-sm font-medium text-ink">{c.success}</p>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <FormField label={c.email} htmlFor="login-email">
        <input id="login-email" name="email" type="email" required autoComplete="email" className={inputClasses} />
      </FormField>

      <FormField label={c.password} htmlFor="login-password">
        <div className="relative">
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            className={inputClasses}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 end-3 flex items-center text-muted"
            aria-label="Toggle password visibility"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <div className="mt-2 text-end">
          <a href="#" className="text-xs font-medium text-muted hover:text-ink">
            {c.forgotPassword}
          </a>
        </div>
      </FormField>

      <Button type="submit" className="w-full" disabled={status === "submitting"}>
        {status === "submitting" ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            {c.submitting}
          </span>
        ) : (
          c.submit
        )}
      </Button>

      <p className="text-center text-sm text-muted">
        {c.noAccount}{" "}
        <a href={`/${locale}/register`} className="font-medium text-ink hover:underline">
          {c.createAccount}
        </a>
      </p>
    </form>
  );
}
