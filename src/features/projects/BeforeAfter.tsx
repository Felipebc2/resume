"use client";

import { useTranslations } from "next-intl";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { clamp, easeOut } from "@/lib/math";
import { useStill } from "@/lib/motion";
import s from "./Projects.module.css";

/** n skeleton text lines, each row a bit shorter than the one above in a cycle of 3 */
const Lines = ({ n, w, gap = 7 }: { n: number; w: number; gap?: number }) => (
  <div style={{ display: "grid", gap }}>
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
            style={{ height: 12, background: "#34343a" }}
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
        <Lines n={9} w={90} gap={6} />
        <Lines n={9} w={96} gap={6} />
      </div>
    </div>
  );
}

function After({ headline }: { headline: string }) {
  return (
    <div className={`${s.mock} ${s.new}`}>
      <div className={s.mkH}>{headline}</div>
      <Lines n={2} w={40} gap={9} />
      <div className={`${s.mkB} ${s.mkBtn}`} />
      <div
        className={s.mkRow}
        style={{ gridTemplateColumns: "2fr 1fr 1fr", gap: 14 }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${s.mkB} ${s.mkCard}`} />
        ))}
      </div>
    </div>
  );
}

/** drag (or arrow-key) the handle to wipe between the old NormAI screen and the redesign */
export function BeforeAfter() {
  const t = useTranslations("Projects.ba");
  const still = useStill();
  const [x, setX] = useState(still ? 50 : 88);
  const cmp = useRef<HTMLDivElement>(null);
  const set = (v: number) => setX(clamp(v, 0, 100));

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

  const fromE = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    set(((e.clientX - r.left) / r.width) * 100);
  };

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
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          fromE(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) fromE(e);
        }}
      >
        <div className={s.layer}>
          <Before />
        </div>
        <div className={`${s.layer} ${s.after}`}>
          <After headline={t("headline")} />
        </div>
        <span className={`${s.vlabel} ${s.l}`}>{t("before")}</span>
        <span className={`${s.vlabel} ${s.r}`}>{t("after")}</span>
        <div
          className={s.handle}
          tabIndex={0}
          role="slider"
          aria-label={t("slider")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(x)}
          onKeyDown={(e) => {
            const d = { ArrowLeft: -5, ArrowRight: 5 }[e.key];
            if (!d) return;
            e.preventDefault();
            set(x + d);
          }}
        >
          <span aria-hidden="true">⇄</span>
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
