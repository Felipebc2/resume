import type { Metadata, Viewport } from "next";
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
  const { name } = profile.seo;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("title"), template: `%s · ${name}` },
    description: t("description"),
    alternates: { canonical: "/" },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: name,
      title: t("title"),
      description: t("description"),
      url: "/",
      locale: "en_US",
      alternateLocale: ["pt_BR"],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}

export const viewport: Viewport = { themeColor: "#090b10" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // the boot script rewrites data-theme, data-mode and lang before hydration
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      data-mode="dark"
      suppressHydrationWarning
      className={`${instrument.variable} ${anton.variable} ${geist.variable} ${geistMono.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <LangProvider en={await getMessages()} timeZone={await getTimeZone()}>
          <MotionProvider>{children}</MotionProvider>
        </LangProvider>
      </body>
    </html>
  );
}
