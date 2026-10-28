import type { Metadata } from "next";
import { getMessages, getTimeZone, getTranslations } from "next-intl/server";
import { Anton, Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { DEFAULT_THEME } from "@/content/themes";
import { profile } from "@/content/profile";
import { LangProvider } from "@/lib/lang";
import { MotionProvider } from "@/lib/motion";
import { SITE_URL } from "@/lib/site";
import { bootScript } from "@/lib/theme";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return {
    metadataBase: new URL(SITE_URL),
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/" },
    openGraph: {
      type: "profile",
      title: t("title"),
      description: t("description"),
      url: "/",
      siteName: profile.name,
      locale: "en_US",
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("Meta");
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: (await getTranslations("Hero")).raw("roles")[0],
    description: t("description"),
    url: SITE_URL,
    email: profile.contacts.email.href,
    address: { "@type": "PostalAddress", addressLocality: profile.city },
    sameAs: [profile.links.github, profile.links.linkedin],
  };

  return (
    // the boot script rewrites data-theme and lang before hydration
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      suppressHydrationWarning
      className={`${instrument.variable} ${anton.variable} ${geist.variable} ${geistMono.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(person).replace(/</g, "\\u003c"),
          }}
        />
        <LangProvider en={await getMessages()} timeZone={await getTimeZone()}>
          <MotionProvider>{children}</MotionProvider>
        </LangProvider>
      </body>
    </html>
  );
}
