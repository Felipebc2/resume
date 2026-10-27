"use client";

import { useLocale } from "next-intl";
import { useEffect, useRef } from "react";
import { clamp, easeOut } from "@/lib/math";
import { useStill } from "@/lib/motion";

/** Counts from 0 to `to` on mount (count mode of React Bits' CountUp). Readers get the final value. */
export function CountUp({
  to,
  duration = 2,
  delay = 0,
  className = "",
}: {
  to: number;
  /** seconds */
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const still = useStill();
  const locale = useLocale();
  const fmt = (v: number) => Math.round(v).toLocaleString(locale);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const show = (v: number) =>
      (el.textContent = Math.round(v).toLocaleString(locale));
    if (still) return void show(to);
    const t0 = performance.now() + delay * 1000;
    let raf = 0;
    const tick = (now: number) => {
      const p = clamp((now - t0) / (duration * 1000), 0, 1);
      show(to * easeOut(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration, delay, still, locale]);

  return (
    <span className={`tabular-nums ${className}`}>
      <span ref={ref} aria-hidden="true">
        {fmt(0)}
      </span>
      <span className="sr-only">{fmt(to)}</span>
    </span>
  );
}
