import { cacheLife } from "next/cache";
import { profile } from "@/content/profile";
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
import { SITE_URL } from "@/lib/site";

const { seo, links, city } = profile;
const person = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: seo.name,
  alternateName: seo.alternateName,
  jobTitle: seo.jobTitle,
  url: new URL(SITE_URL).href,
  sameAs: [links.github, links.linkedin],
  knowsAbout: seo.knowsAbout,
  address: {
    "@type": "PostalAddress",
    addressLocality: city,
    addressCountry: seo.country,
  },
};

async function year() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export default async function Home() {
  const [live, visitors] = await Promise.all([getGithubStats(), getVisitors()]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(person).replace(/</g, "\\u003c"),
        }}
      />
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
