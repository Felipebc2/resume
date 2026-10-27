"use client";

import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { clamp } from "@/lib/math";
import s from "./Header.module.css";

/** label key → anchor. Sections not built yet point at the Projects placeholder. */
const LINKS = [
  ["stack", "stack-step"],
  ["experience", "experience"],
  ["projects", "projects"],
  ["education", "projects"],
  ["about", "projects"],
  ["contact", "projects"],
] as const;

export function Nav() {
  const t = useTranslations("Header");
  const [active, setActive] = useState(-1);
  const nav = useRef<HTMLElement>(null);
  const ind = useRef<HTMLSpanElement>(null);
  const prog = useRef<HTMLElement>(null);

  useEffect(() => {
    const stack = document.getElementById("stack");
    const exp = document.getElementById("experience");
    const prj = document.getElementById("projects");
    const el = nav.current;
    const read = () => {
      const vh = innerHeight;
      if (el) el.dataset.nav = scrollY > vh * 0.4 ? "in" : "out";
      const max = document.documentElement.scrollHeight - vh;
      if (prog.current)
        prog.current.style.transform = `scaleX(${clamp(scrollY / Math.max(1, max), 0, 1)})`;
      const expTop = exp?.getBoundingClientRect().top ?? Infinity;
      const stackTop = stack?.getBoundingClientRect().top ?? Infinity;
      const prjTop = prj?.getBoundingClientRect().top ?? Infinity;
      setActive(
        prjTop < vh * 0.5
          ? 2
          : expTop < vh * 0.5
            ? 1
            : stackTop < vh * 0.35
              ? 0
              : -1,
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
