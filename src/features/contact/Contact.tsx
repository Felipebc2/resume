import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { profile } from "@/content/profile";
import { Signature } from "./Signature";
import s from "./Contact.module.css";

const ICON: Record<"linkedin" | "github" | "whatsapp" | "loc", ReactNode> = {
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M8 10.5V16M8 7.6v.1M11.5 16v-5.5M11.5 13c0-1.6 1-2.6 2.4-2.6s2.1 1 2.1 2.6V16" />
    </>
  ),
  github: (
    <path d="M9 19c-4 1.3-4-2-6-2.5M15 21v-3.4a3 3 0 0 0-.8-2.2c2.7-.3 5.5-1.3 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6 0C6.5 2.7 5.5 3 5.5 3a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.4c0 4.6 2.8 5.7 5.5 6a3 3 0 0 0-.8 2.2V21" />
  ),
  whatsapp: (
    <>
      <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" />
      <path d="M9 9.5c.4 2.2 2.3 4.1 4.5 4.5l1.2-1.2 1.8.8-.4 1.6c-3.6.4-7.7-3.7-7.3-7.3l1.6-.4.8 1.8z" />
    </>
  ),
  loc: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
};

/* background traces, in % of the section (the SVG stretches; strokes don't) */
const TRACES = [
  "M0 5H7L14 15H20",
  "M2 0V9L9 22",
  "M100 8H92L86 14H80",
  "M100 20H95L90 27",
  "M0 94H5L10 86",
  "M100 90H94L90 97H84",
];
const PADS = "M20 15h0M9 22h0M80 14h0M90 27h0M10 86h0M84 97h0";

const host = (url: string) => url.replace(/^https:\/\/(www\.)?|\/$/g, "");

/** Contact and About in one section: ways to reach me on the left, who I am on the right. */
export async function Contact() {
  const t = await getTranslations("Contact");
  const h = await getTranslations("Hero");
  const { links, contacts, city } = profile;
  const cards = [
    { key: "linkedin", href: links.linkedin, sub: host(links.linkedin) },
    { key: "github", href: links.github, sub: host(links.github) },
    {
      key: "whatsapp",
      href: contacts.whatsapp.href,
      sub: contacts.phone.title,
    },
  ] as const;

  return (
    <section id="contact" aria-labelledby="contact-title" className={s.ct}>
      <p className={s.ghost} aria-hidden="true">
        {t("badge")}
      </p>
      <svg
        className={s.circ}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {TRACES.map((d) => (
          <path key={d} d={d} />
        ))}
        {TRACES.map((d, i) => (
          <path
            key={`s${d}`}
            d={d}
            pathLength={1}
            className={s.spark}
            style={{ animationDelay: `${-i * 0.9}s` }}
          />
        ))}
        <path d={PADS} className={s.pad} />
        <path d={PADS} className={s.padIn} />
      </svg>

      <div className={s.grid}>
        <div className={s.left}>
          <span className={s.badge}>
            <i aria-hidden="true">@</i>
            {t("badge")}
          </span>
          <h2 id="contact-title">
            {t.rich("title", { big: (c) => <span>{c}</span> })}
          </h2>
          <p className={s.sub}>{t("sub")}</p>
          <div className={s.cards}>
            {cards.map((c) => (
              <a
                key={c.key}
                className={s.cc}
                href={c.href}
                target="_blank"
                rel="noopener"
              >
                <Icon k={c.key} />
                <span>
                  <b>{h(c.key)}</b>
                  <span className={s.s}>{c.sub}</span>
                </span>
                <span className={s.go} aria-hidden="true">
                  ↗
                </span>
              </a>
            ))}
            <div className={s.cc}>
              <Icon k="loc" />
              <span>
                <b>{t("where", { city })}</b>
                <span className={s.s}>{t("whereSub")}</span>
              </span>
            </div>
          </div>
          <a className={s.cv} href={links.cv} download>
            {t("cv")}
          </a>
        </div>

        <article className={s.about} aria-labelledby="about-title">
          <div className={s.txt}>
            <div className={s.k}>
              <span>{t("about.kicker")}</span>
              <span>{t("about.zone", { city })}</span>
            </div>
            <h3 id="about-title">{t("about.title", { city })}</h3>
            <div className={s.cols}>
              <p>{t.rich("about.p1", { b: (c) => <b>{c}</b> })}</p>
              <p>{t.rich("about.p2", { b: (c) => <b>{c}</b> })}</p>
            </div>
          </div>
          <Signature />
        </article>
      </div>
    </section>
  );
}

const Icon = ({ k }: { k: keyof typeof ICON }) => (
  <span className={s.ic} aria-hidden="true">
    <svg viewBox="0 0 24 24">{ICON[k]}</svg>
  </span>
);
