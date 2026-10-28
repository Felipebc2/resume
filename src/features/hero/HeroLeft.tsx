"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { clamp } from "@/lib/math";
import { useStill } from "@/lib/motion";
import s from "./Hero.module.css";

/** Publishes how far the hero has scrolled away (`--p`, 0→1) on its section;
    Hero.module.css turns it into the focus pull onto the greeting. */
export function HeroLeft({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useStill();

  useEffect(() => {
    const hero = ref.current?.closest("section");
    if (!hero) return;
    const read = () => {
      const p = still ? 0 : clamp(scrollY / hero.offsetHeight, 0, 1);
      hero.style.setProperty("--p", p.toFixed(4));
      hero.toggleAttribute("data-leaving", p > 0);
    };
    read();
    addEventListener("scroll", read, { passive: true });
    return () => removeEventListener("scroll", read);
  }, [still]);

  return (
    <div ref={ref} className={s.left}>
      {children}
    </div>
  );
}
