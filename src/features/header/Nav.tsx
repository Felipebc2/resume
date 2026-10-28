"use client";

import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { clamp } from "@/lib/math";
import s from "./Header.module.css";

/** label key → anchor. Sections not built yet point at the placeholder after Projects. */
const LINKS = [
  ["stack", "stack-step"],
  ["experience", "experience"],
  ["projects", "projects"],
  ["about", "next"],
  ["contact", "next"],
] as const;

export function Nav() {
  const t = useTranslations("Header");
  const [active, setActive] = useState(-1);
  const nav = useRef<HTMLElement>(null);
  const ind = useRef<HTMLSpanElement>(null);
  const prog = useRef<HTMLElement>(null);

  useEffect(() => {
    /* section → how far up the viewport its top must pass to light its link */
    const marks = (
      [
        ["stack", 0.35],
        ["experience", 0.5],
        ["projects", 0.5],
      ] as const
    ).map(([id, at]) => [document.getElementById(id), at] as const);
    const el = nav.current;
    const read = () => {
      const vh = innerHeight;
      if (el) el.dataset.nav = scrollY > vh * 0.4 ? "in" : "out";
      const max = document.documentElement.scrollHeight - vh;
      if (prog.current)
        prog.current.style.transform = `scaleX(${clamp(scrollY / Math.max(1, max), 0, 1)})`;
      setActive(
        marks.findLastIndex(
          ([sec, at]) =>
            (sec?.getBoundingClientRect().top ?? Infinity) < vh * at,
        ),
      );
    };
    read();
    addEventListener("scroll", read, { passive: true });
    return () => removeEventListener("scroll", read);
  }, []);

  useLayoutEffect(() => {
    const el = nav.current;
    if (!el) return;
    const place = () => {
      const a = el.querySelectorAll("a")[active];
      const i = ind.current;
      if (!i) return;
      if (!a) {
        i.style.opacity = "0";
        return;
      }
      i.style.opacity = "1";
      i.style.width = `${a.offsetWidth}px`;
      i.style.transform = `translateX(${a.offsetLeft}px)`;
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
  }, [active]);

  return (
    <nav ref={nav} className={s.nav} aria-label={t("nav")}>
      <span ref={ind} className={s.ind} aria-hidden="true" />
      {LINKS.map(([key, href], i) => (
        <a
          key={key}
          href={`#${href}`}
          aria-current={i === active ? "true" : undefined}
        >
          {t(`links.${key}`)}
        </a>
      ))}
      <span className={s.prog} aria-hidden="true">
        <i ref={prog} />
      </span>
    </nav>
  );
}
