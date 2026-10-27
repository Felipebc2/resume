"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ramp } from "@/lib/math";
import { useStill } from "@/lib/motion";
import s from "./Hero.module.css";

/** Parallax + fade of the hero copy while the hero scrolls away. */
export function HeroLeft({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useStill();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (still) {
      el.style.transform = "";
      el.style.opacity = "";
      return;
    }
    const read = () => {
      const vh = innerHeight;
      const hy = Math.min(scrollY, vh);
      el.style.transform = `translateY(${hy * 0.22}px)`;
      el.style.opacity = String(1 - ramp(hy, vh * 0.15, vh * 0.8));
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
