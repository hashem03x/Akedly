import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n/config";

const routes = ["", "/pricing", "/login", "/register", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://akedly.com";

  return locales.flatMap((locale) =>
    routes.map((route) => ({
      url: `${base}/${locale}${route}`,
      lastModified: new Date(),
    })),
  );
}
