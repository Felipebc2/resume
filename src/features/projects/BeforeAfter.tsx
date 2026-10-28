"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { easeOut } from "@/lib/math";
import { useStill } from "@/lib/motion";
import s from "./Projects.module.css";

/** n skeleton text lines, each row a bit shorter than the one above in a cycle of 3 */
/** `gap` is a step of the 4px grid (--s-n): the old page is cramped, the new one breathes */
const Lines = ({ n, w, gap = 2 }: { n: number; w: number; gap?: number }) => (
  <div style={{ display: "grid", gap: `var(--s-${gap})` }}>
    {Array.from({ length: n }, (_, i) => (
      <div
        key={i}
        className={s.mkL}
        style={{ width: `${w - (i % 3) * 14}%` }}
      />
    ))}
  </div>
);

function Before() {
  return (
    <div className={`${s.mock} ${s.old}`}>
      <div className={s.mkRow} style={{ gridTemplateColumns: "repeat(9,1fr)" }}>
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            className={s.mkB}
            style={{ height: 12, background: "var(--color-line)" }}
          />
        ))}
      </div>
      <Lines n={2} w={60} />
      <div className={s.mkRow} style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className={`${s.mkB} ${s.cell}`} />
        ))}
      </div>
      <div className={s.mkRow} style={{ gridTemplateColumns: "120px 1fr" }}>
        <Lines n={9} w={90} gap={2} />
        <Lines n={9} w={96} gap={2} />
      </div>
    </div>
  );
}

function After({ headline }: { headline: string }) {
  return (
    <div className={`${s.mock} ${s.new}`}>
      <div className={s.mkH}>{headline}</div>
      <Lines n={2} w={40} gap={3} />
      <div className={`${s.mkB} ${s.mkBtn}`} />
      <div
        className={s.mkRow}
        style={{ gridTemplateColumns: "2fr 1fr 1fr", gap: "var(--s-4)" }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${s.mkB} ${s.mkCard}`} />
        ))}
      </div>
    </div>
  );
}

/** drag (or arrow-key) the native range to wipe between the old NormAI screen and the redesign */
export function BeforeAfter() {
  const t = useTranslations("Projects.ba");
  const still = useStill();
  const [x, setX] = useState(still ? 50 : 88);
  const cmp = useRef<HTMLDivElement>(null);

  /* first time it is half in view, the handle sweeps from 88% to the middle */
  useEffect(() => {
    const el = cmp.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        if (still) return setX(50);
        const t0 = performance.now();
        const f = (now: number) => {
          const k = Math.min(1, (now - t0) / 1000);
          setX(88 - 38 * easeOut(k));
          if (k < 1) raf = requestAnimationFrame(f);
        };
        raf = requestAnimationFrame(f);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [still]);

  return (
    <section className={s.ba} aria-label={t("label")}>
      <div className={s.baHead}>
        <div>
          <span className={s.n}>{t("kicker")}</span>
          <h3>{t("title")}</h3>
        </div>
        <p>{t("body")}</p>
      </div>
      <div
        ref={cmp}
        className={s.cmp}
        style={{ "--x": `${x}%` } as CSSProperties}
      >
        <div className={s.layer}>
          <Before />
        </div>
        <div className={`${s.layer} ${s.after}`}>
          <After headline={t("headline")} />
        </div>
        <span className={`${s.vlabel} ${s.l}`}>{t("before")}</span>
        <span className={`${s.vlabel} ${s.r}`}>{t("after")}</span>
        <input
          type="range"
          className={s.range}
          min={0}
          max={100}
          step="any"
          value={x}
          aria-label={t("slider")}
          onChange={(e) => setX(+e.target.value)}
        />
        <div className={s.handle} aria-hidden="true">
          <span>⇄</span>
        </div>
      </div>
      <div className={s.baNotes}>
        <div>
          <b>{t("before")}</b>
          <p>{t("notesBefore")}</p>
        </div>
        <div>
          <b>{t("after")}</b>
          <p>{t("notesAfter")}</p>
        </div>
      </div>
    </section>
  );
}
