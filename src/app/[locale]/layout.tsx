import { hasLocale, NextIntlClientProvider } from "next-intl";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Anton, Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { profile } from "@/content/profile";
import { MotionProvider } from "@/lib/motion";
import { localePath, SITE_URL } from "@/lib/site";
import "@/styles/globals.css";

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});
const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});
const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "Meta" });
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, localePath(l)]),
  );
  return {
    metadataBase: new URL(SITE_URL),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: localePath(locale),
      languages: { ...languages, "x-default": "/" },
    },
    openGraph: {
      type: "profile",
      title: t("title"),
      description: t("description"),
      url: localePath(locale),
      siteName: profile.name,
      locale: locale === "pt" ? "pt_BR" : "en_US",
    },
    twitter: { card: "summary_large_image" },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Meta" });
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: (await getTranslations({ locale, namespace: "Hero" })).raw(
      "roles",
    )[0],
    description: t("description"),
    url: SITE_URL,
    email: profile.contacts.email.href,
    address: { "@type": "PostalAddress", addressLocality: profile.city },
    sameAs: [profile.links.github, profile.links.linkedin],
  };

  return (
    <html
      lang={locale}
      className={`${instrument.variable} ${anton.variable} ${geist.variable} ${geistMono.variable} antialiased`}
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(person).replace(/</g, "\\u003c"),
          }}
        />
        <NextIntlClientProvider>
          <MotionProvider>{children}</MotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
