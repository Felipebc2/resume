"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { profile } from "@/content/profile";
import type { Stat } from "@/content/stats";
import { clamp, ease, easeOut } from "@/lib/math";
import { useStill } from "@/lib/motion";
import { Clock } from "./Clock";
import { formatStat } from "./format";
import { buildGrid, COLS, levelsAt, ROWS } from "./grid";
import s from "./Stack.module.css";

const GRID = buildGrid();
const CELLS = COLS * ROWS;
const LEVELS = [0, 1, 2, 3, 4] as const;

type Step = -1 | 0 | 1;

export function StackStory({ stats }: { stats: Stat[] }) {
  const t = useTranslations("Stack");
  const locale = useLocale();
  const still = useStill();
  const [step, setStep] = useState<Step>(-1);

  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const flow = useRef<HTMLDivElement>(null);
  const cardBody = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const values = useRef<(HTMLElement | null)[]>([]);

  /* layout: scale the flow to fit the viewport and size the sticky track around it */
  useEffect(() => {
    const measure = () => {
      const sec = section.current,
        st = stage.current,
        fl = flow.current;
      const body = cardBody.current;
      if (!sec || !st || !fl || !body) return;
      /* measure the flow as it will look in step 1 (card open, unscaled) */
      body.style.transition = "none";
      body.style.gridTemplateRows = "1fr";
      fl.style.transform = "translateX(-50%)";
      const full = fl.offsetHeight;
      body.style.gridTemplateRows = "";
      void body.offsetHeight;
      body.style.transition = "";

      const hdr = document.querySelector("header");
      const top = (hdr?.offsetHeight ?? 0) + 24;
      const vh = innerHeight;
      const sc = Math.min(1, (vh - top - 20) / full);
      const flowTop = Math.max(top, (vh - full * sc) / 2 + top / 3);
      fl.style.top = `${flowTop}px`;
      fl.style.transform = `translateX(-50%) scale(${sc})`;

      const fw = fl.offsetWidth * sc;
      const bottom = Math.ceil(flowTop + full * sc);
      st.style.height = `${bottom}px`;
      sec.style.height = `${bottom + vh}px`;

      const root = document.documentElement.style;
      root.setProperty("--flow-left", `${(st.clientWidth - fw) / 2}px`);
      root.setProperty("--flow-w", `${fw}px`);
      const list = document.getElementById("stacklist");
      const start = sec.offsetTop + vh;
      root.setProperty("--free-top", `${start}px`);
      root.setProperty(
        "--free-h",
        `${Math.max(vh, list ? list.offsetTop + list.offsetHeight - start : vh)}px`,
      );
    };
    const ro = new ResizeObserver(measure);
    ro.observe(document.documentElement);
    document.fonts?.ready.then(measure);
    measure();
    return () => ro.disconnect();
  }, []);

  /* scroll → step */
  useEffect(() => {
    const read = () => {
      const r = section.current?.getBoundingClientRect();
      if (!r) return;
      const vh = innerHeight;
      setStep(r.top > vh * 0.5 ? -1 : -r.top < vh * 0.5 ? 0 : 1);
      document.documentElement.toggleAttribute(
        "data-scrolled",
        -r.top > vh + 4,
      );
    };
    read();
    addEventListener("scroll", read, { passive: true });
    return () => removeEventListener("scroll", read);
  }, []);

  /* step → grid draw + count-up */
  useEffect(() => {
    const cells = grid.current?.children;
    const paint = (d: number) => {
      if (!cells) return;
      levelsAt(GRID, d).forEach((lv, i) => {
        (cells[i] as HTMLElement).dataset.l = String(lv);
      });
    };
    const show = (i: number, v: number) => {
      const el = values.current[i];
      if (el) el.textContent = formatStat(v, stats[i].format, locale);
    };
    let raf = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const animate = (
      delay: number,
      dur: number,
      frame: (t: number) => void,
    ) => {
      const t0 = performance.now() + delay;
      const tick = (now: number) => {
        const p = clamp((now - t0) / dur, 0, 1);
        frame(p);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    if (step === 1) {
      if (still) {
        paint(1);
        stats.forEach((st, i) => show(i, st.value));
      } else {
        animate(650, 700, (p) => paint(ease(p)));
        stats.forEach((st, i) =>
          timers.push(
            setTimeout(
              () => {
                const t0 = performance.now();
                const tick = (now: number) => {
                  const p = clamp((now - t0) / 1000, 0, 1);
                  show(i, st.value * easeOut(p));
                  if (p < 1) requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
              },
              1050 + i * 60,
            ),
          ),
        );
      }
    } else {
      timers.push(
        setTimeout(
          () => {
            paint(0);
            stats.forEach((_, i) => show(i, 0));
          },
          still ? 0 : 500,
        ),
      );
    }
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
    };
  }, [step, still, locale, stats]);

  const greet = t.raw("greet") as string[];
  const stepClass = step === 0 ? s.s0 : step === 1 ? s.s1 : "";

  return (
    <section
      ref={section}
      className={s.stack}
      id="stack"
      aria-label={t("label")}
    >
      <div className={s.snap} style={{ top: 0 }} aria-hidden="true" />
      <div
        className={s.snap}
        style={{ top: "100vh" }}
        id="stack-step"
        aria-hidden="true"
      />
      <div ref={stage} className={`${s.stage} ${stepClass}`}>
        <div className={s.greet}>
          <h2>
            {greet.map((w, i) => (
              <span key={i}>
                {i > 0 && " "}
                <span className={s.w}>{w}</span>
              </span>
            ))}
          </h2>
          <p>{t("intro")}</p>
        </div>

        <div ref={flow} className={s.flow}>
          <h2 className={s.stitle}>
            {t("titleTop")} <em>{t("titleEm")}</em>
          </h2>

          <div className={s.card}>
            <div className={s.cardTop}>
              <span>
                <b>{formatStat(stats[0].value, "int", locale)}</b>{" "}
                {t("contributions")}
              </span>
              <span className={s.muted}>
                <span className={s.dot} />
                {t("city")} · <Clock timeZone={profile.timeZone} /> ·{" "}
                {profile.links.github.replace("https://", "")}
              </span>
            </div>
            <div ref={cardBody} className={s.cardBody}>
              <div>
                <div className={s.cardInner}>
                  <div
                    ref={grid}
                    className={s.grid}
                    role="img"
                    aria-label={t("graph")}
                  >
                    {Array.from({ length: CELLS }, (_, i) => (
                      <i key={i} />
                    ))}
                  </div>
                  <div className={s.cardFoot}>
                    <span className={s.legend} aria-hidden="true">
                      {t("less")}
                      {LEVELS.map((l) => (
                        <i
                          key={l}
                          style={{ background: `var(--color-l${l})` }}
                        />
                      ))}
                      {t("more")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <dl className={s.results}>
            {stats.map((st, i) => (
              <div key={st.key} className={s.res}>
                <dt>{t(`results.${st.key}`)}</dt>
                <dd ref={(el) => void (values.current[i] = el)}>
                  {formatStat(st.value, st.format, locale)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
