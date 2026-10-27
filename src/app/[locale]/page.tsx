import type { Locale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { stats } from "@/content/stats";
import { ExperiencePlaceholder } from "@/features/experience/ExperiencePlaceholder";
import { Header } from "@/features/header/Header";
import { Hero } from "@/features/hero/Hero";
import { StackList } from "@/features/stack/StackList";
import { StackStory } from "@/features/stack/StackStory";
import { getGithubStats } from "@/lib/github";

export default async function Home({ params }: PageProps<"/[locale]">) {
  setRequestLocale((await params).locale as Locale);
  const live = await getGithubStats();
  return (
    <>
      <Header />
      <main id="main" className="relative">
        <Hero />
        <StackStory
          stats={stats.map((st) => ({
            ...st,
            value: live[st.key] ?? st.value,
          }))}
        />
        <StackList />
        {/* one tall snap area over the stack list, so it scrolls freely under mandatory snap */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 w-px snap-start"
          style={{ top: "var(--free-top)", height: "var(--free-h)" }}
        />
        <ExperiencePlaceholder />
      </main>
    </>
  );
}
