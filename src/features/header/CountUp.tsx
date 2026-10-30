"use client";

import { useLocale } from "next-intl";
import { useEffect, useRef } from "react";
import { clamp, easeOut } from "@/lib/math";
import { useStill } from "@/lib/motion";
import { formatStat } from "@/features/stack/format";

const fmt = (v: number, locale: string) => formatStat(v, "int", locale);
/** seconds before the count starts */
const DELAY = 0.4;

/** Counts from 0 to `to` on mount (count mode of React Bits' CountUp). Readers get the final value. */
export function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const still = useStill();
  const locale = useLocale();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const show = (v: number) => (el.textContent = fmt(v, locale));
    if (still) return void show(to);
    const t0 = performance.now() + DELAY * 1000;
    let raf = 0;
    const tick = (now: number) => {
      const p = clamp((now - t0) / 2000, 0, 1);
      show(to * easeOut(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, still, locale]);

  return (
    <span className="tabular-nums">
      <span ref={ref} aria-hidden="true">
        {fmt(0, locale)}
      </span>
      <span className="sr-only">{fmt(to, locale)}</span>
    </span>
  );
}
