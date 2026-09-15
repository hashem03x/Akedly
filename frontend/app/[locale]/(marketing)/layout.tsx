import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getCurrentMerchantServer } from "@/lib/api/server";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default async function MarketingLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);

  const cookieHeader = (await cookies()).toString();
  const result = await getCurrentMerchantServer(cookieHeader);

  return (
    <div className="flex flex-1 flex-col">
      <Navbar locale={locale} dict={dict} currentMerchant={result?.merchant ?? null} />
      <main className="flex-1">{children}</main>
      <Footer locale={locale} dict={dict} />
    </div>
  );
}
