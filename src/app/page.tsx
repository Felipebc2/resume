import { cacheLife } from "next/cache";
import { stats } from "@/content/stats";
import { Contact } from "@/features/contact/Contact";
import { Experience } from "@/features/experience/Experience";
import { Footer } from "@/features/footer/Footer";
import { Header } from "@/features/header/Header";
import { Hero } from "@/features/hero/Hero";
import { Projects } from "@/features/projects/Projects";
import { StackList } from "@/features/stack/StackList";
import { StackStory } from "@/features/stack/StackStory";
import { getGithubStats } from "@/lib/github";
import { getVisitors, goatcounterCode } from "@/lib/goatcounter";

async function year() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export default async function Home() {
  const [live, visitors] = await Promise.all([getGithubStats(), getVisitors()]);
  return (
    <>
      <Header code={goatcounterCode} visitors={visitors} />
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
        <Contact />
      </main>
      <Footer year={await year()} />
    </>
  );
}
