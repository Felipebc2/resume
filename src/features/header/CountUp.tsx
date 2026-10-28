"use client";

import { useLocale } from "next-intl";
import { useEffect, useRef } from "react";
import { clamp, easeOut } from "@/lib/math";
import { useStill } from "@/lib/motion";

const fmt = (v: number, locale: string) => Math.round(v).toLocaleString(locale);

/** Counts from 0 to `to` on mount (count mode of React Bits' CountUp). Readers get the final value. */
export function CountUp({
  to,
  delay = 0,
}: {
  to: number;
  /** seconds */
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const still = useStill();
  const locale = useLocale();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const show = (v: number) => (el.textContent = fmt(v, locale));
    if (still) return void show(to);
    const t0 = performance.now() + delay * 1000;
    let raf = 0;
    const tick = (now: number) => {
      const p = clamp((now - t0) / 2000, 0, 1);
      show(to * easeOut(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, delay, still, locale]);

  return (
    <span className="tabular-nums">
      <span ref={ref} aria-hidden="true">
        {fmt(0, locale)}
      </span>
      <span className="sr-only">{fmt(to, locale)}</span>
    </span>
  );
}
