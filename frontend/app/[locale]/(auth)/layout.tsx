import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { AuthNavbar } from "@/components/layout/auth-navbar";

export default async function AuthLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <AuthNavbar locale={locale} />
      {children}
    </div>
  );
}
