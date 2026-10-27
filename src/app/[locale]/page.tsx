import type { Locale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { stats } from "@/content/stats";
import { Experience } from "@/features/experience/Experience";
import { Header } from "@/features/header/Header";
import { Hero } from "@/features/hero/Hero";
import { NextPlaceholder } from "@/features/next/NextPlaceholder";
import { Projects } from "@/features/projects/Projects";
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
        <Experience />
        <Projects />
        <NextPlaceholder />
      </main>
    </>
  );
}
