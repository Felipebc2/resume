import type { Locale } from "next-intl";
import { routing } from "@/i18n/routing";

/** Public origin. Set NEXT_PUBLIC_SITE_URL in Vercel once the domain exists. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

/** Path for a locale under `localePrefix: "as-needed"`. */
export const localePath = (locale: Locale) =>
  locale === routing.defaultLocale ? "/" : `/${locale}`;
