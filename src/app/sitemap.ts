import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { localePath, SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, `${SITE_URL}${localePath(l)}`]),
  );
  return routing.locales.map((locale) => ({
    url: `${SITE_URL}${localePath(locale)}`,
    alternates: { languages },
  }));
}
