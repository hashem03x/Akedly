"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Button } from "@/components/ui/button";
import { FormField, inputClasses } from "@/components/auth/form-field";
import { ApiRequestError } from "@/lib/api/client";
import { registerMerchant } from "@/lib/api/auth";

export function RegisterForm({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const c = dict.auth.register;
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  const platformOptions = Object.entries(c.platformOptions);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus("submitting");

    const formData = new FormData(event.currentTarget);
    const platform = String(formData.get("platform") ?? "");

    try {
      await registerMerchant({
        name: String(formData.get("name") ?? ""),
        businessName: String(formData.get("businessName") ?? "") || undefined,
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? "") || undefined,
        password: String(formData.get("password") ?? ""),
        platform: platform || undefined,
      });
      setStatus("success");
      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch (err) {
      setStatus("idle");
      if (err instanceof ApiRequestError) {
        if (err.code === "EMAIL_ALREADY_EXISTS") setError(c.errors.emailExists);
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

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={c.name} htmlFor="register-name">
          <input id="register-name" name="name" type="text" required autoComplete="name" className={inputClasses} />
        </FormField>
        <FormField label={c.businessName} htmlFor="register-business">
          <input id="register-business" name="businessName" type="text" required className={inputClasses} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={c.email} htmlFor="register-email">
          <input id="register-email" name="email" type="email" required autoComplete="email" className={inputClasses} />
        </FormField>
        <FormField label={c.phone} htmlFor="register-phone">
          <input id="register-phone" name="phone" type="tel" required autoComplete="tel" className={inputClasses} />
        </FormField>
      </div>

      <FormField label={c.password} htmlFor="register-password">
        <div className="relative">
          <input
            id="register-password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
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
      </FormField>

      <FormField label={c.platform} htmlFor="register-platform" optionalLabel={c.platformOptional}>
        <select id="register-platform" name="platform" defaultValue="" className={inputClasses}>
          <option value="" disabled>
            {c.platformPlaceholder}
          </option>
          {platformOptions.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
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

      <p className="text-center text-xs text-muted">{c.terms}</p>

      <p className="text-center text-sm text-muted">
        {c.haveAccount}{" "}
        <a href={`/${locale}/login`} className="font-medium text-ink hover:underline">
          {c.signIn}
        </a>
      </p>
    </form>
  );
}
