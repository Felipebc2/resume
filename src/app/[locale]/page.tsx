import type { Locale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

export default function Home({ params }: PageProps<"/[locale]">) {
  setRequestLocale(use(params).locale as Locale);
  return <main id="main" />;
}
