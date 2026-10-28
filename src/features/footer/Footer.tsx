"use client";

import { useTranslations } from "next-intl";
import { profile } from "@/content/profile";
import { sections } from "@/content/sections";
import { ICON } from "../contact/Contact";
import s from "./Footer.module.css";

/* twinkling dots inside each bracket, in % of the bracket */
const DOTS = {
  l: [
    [22, 18, 0],
    [58, 52, -1.1],
    [36, 80, -2.2],
  ],
  r: [
    [30, 28, -0.6],
    [64, 66, -1.7],
    [46, 12, -2.6],
  ],
} as const;

export function Footer({ year }: { year: number }) {
  const t = useTranslations("Footer");
  const h = useTranslations("Hero");
  const nav = useTranslations("Header.links");
  const { links, contacts, city, handle, name } = profile;
  const social = [
    ["linkedin", links.linkedin],
    ["github", links.github],
    ["whatsapp", contacts.whatsapp.href],
  ] as const;

  const bracket = (side: keyof typeof DOTS) => (
    <span className={`${s.brk} ${s[side]}`} aria-hidden="true">
      {DOTS[side].map(([x, y, d]) => (
        <i
          key={`${x}${y}`}
          style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }}
        />
      ))}
    </span>
  );

  return (
    <footer className={s.ft}>
      <div className={s.in}>
        <div className={s.top}>
          <div className={s.l}>
            <div className={s.soc}>
              {social.map(([k, href]) => (
                <a
                  key={k}
                  href={href}
                  target="_blank"
                  rel="noopener"
                  aria-label={h(k)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {ICON[k]}
                  </svg>
                </a>
              ))}
            </div>
            <a
              className={s.big}
              href={links.github}
              target="_blank"
              rel="noopener"
            >
              @{handle}
            </a>
            <p className={s.addr}>
              {t.rich("addr", { city, br: () => <br /> })}
            </p>
          </div>

          <div className={s.c}>
            {bracket("l")}
            <span className={s.wire} aria-hidden="true" />
            <a
              className={s.cta}
              href={links.linkedin}
              target="_blank"
              rel="noopener"
            >
              {t("cta")}
              <span className={s.tag}>{t("open")}</span>
              <span className={s.ar} aria-hidden="true">
                ↗
              </span>
            </a>
            <span className={s.wire} aria-hidden="true" />
            {bracket("r")}
          </div>

          <nav className={s.nav} aria-label={t("nav")}>
            {sections.map(([key, href]) => (
              <a key={key} href={`#${href}`}>
                {nav(key)}
              </a>
            ))}
          </nav>
        </div>

        <div className={s.bot}>
          <a href="#top">
            {t("top")} <span aria-hidden="true">↑</span>
          </a>
          <span>{t("copy", { year, name })}</span>
          <a className={s.r} href={links.source} target="_blank" rel="noopener">
            {t("source")}
          </a>
        </div>
      </div>

      {/* giant wordmark, cut by the bottom edge */}
      <div className={s.word} aria-hidden="true">
        <svg viewBox="0 0 1000 372" preserveAspectRatio="xMidYMin meet">
          <defs>
            <linearGradient id="ft-word" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0"
                style={{ stopColor: "var(--color-fg)", stopOpacity: 0.22 }}
              />
              <stop
                offset="1"
                style={{ stopColor: "var(--color-fg)", stopOpacity: 0.09 }}
              />
            </linearGradient>
          </defs>
          <text
            x="500"
            y="362"
            textAnchor="middle"
            textLength="990"
            lengthAdjust="spacingAndGlyphs"
            fontSize="500"
            fill="url(#ft-word)"
          >
            EOF
          </text>
        </svg>
      </div>
    </footer>
  );
}
