"use client";

import { useLocale, useTranslations } from "next-intl";
import Lenis from "lenis";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { profile } from "@/content/profile";
import type { Stat } from "@/content/stats";
import { clamp, ease, easeOut } from "@/lib/math";
import { useStill } from "@/lib/motion";
import { Clock } from "./Clock";
import { formatStat } from "./format";
import { buildGrid, levelsAt, twinkle } from "./grid";
import { inGap, nextStep, push, type Push } from "./steps";
import s from "./Stack.module.css";

/* finer on desktop; phones keep the coarse grid so cells stay a few px wide */
const GRIDS = { coarse: buildGrid("coarse"), fine: buildGrid("fine") };
/* the graph keeps breathing: every TICK ms a few commits flicker a shade for FLICKER ms */
const TICK = 140;
const FLICKER = 700;
const WIDE = "(min-width: 761px)";
const onWide = (cb: () => void) => {
  const mq = matchMedia(WIDE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const LEVELS = [0, 1, 2, 3, 4] as const;

type Step = -1 | 0 | 1;

/** glide between steps (s); after landing, input stays swallowed until it has been
    quiet this long (ms), so a trackpad's momentum tail can't carry on past. Input
    that keeps coming past PASS_PX is a person still scrolling: they pass freely. */
const STEP_S = 0.9;
const SETTLE_MS = 250;
const KEYS: Record<string, 1 | -1> = {
  ArrowDown: 1,
  PageDown: 1,
  " ": 1,
  ArrowUp: -1,
  PageUp: -1,
};
const TYPING = "input, textarea, select, button, [contenteditable]";

export function StackStory({ stats }: { stats: Stat[] }) {
  const t = useTranslations("Stack");
  const locale = useLocale();
  const still = useStill();
  const [step, setStep] = useState<Step>(-1);
  const wide = useSyncExternalStore(
    onWide,
    () => matchMedia(WIDE).matches,
    () => true,
  );
  const G = wide ? GRIDS.fine : GRIDS.coarse;

  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const flow = useRef<HTMLDivElement>(null);
  const cardBody = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const values = useRef<(HTMLElement | null)[]>([]);
  const step1 = useRef<HTMLDivElement>(null);

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
    };
    const ro = new ResizeObserver(measure);
    ro.observe(document.documentElement);
    document.fonts?.ready.then(measure);
    measure();
    return () => ro.disconnect();
  }, []);

  /* steps: Lenis owns wheel/touch so the greeting → stack hop is one locked glide.
     A gesture that would cross a step (or start inside the gap between them) is
     redirected onto the next step, input is swallowed until it lands and settles,
     so a fling can't sail past. Someone who keeps scrolling after the landing
     passes through freely until they stop; stopping inside the gap settles on the
     nearest step. Keys get the same treatment; anchors bypass it. */
  const still_ = useRef(still);
  const lenis = useRef<Lenis | null>(null);
  useEffect(() => {
    const sec = section.current;
    const s1 = step1.current;
    if (!sec || !s1) return;
    let busy = false;
    let landed = false;
    let passing = false;
    let run = 0;
    let acc: Push = { dir: 0, px: 0 };
    let lastInput = 0;
    let anchoring = false;
    let last = scrollY;
    const l = new Lenis({
      autoRaf: true,
      syncTouch: true,
      respectReducedMotion: false, // MotionProvider decides, see the still effect below
      virtualScroll: ({ deltaY, event }) => {
        lastInput = Date.now();
        if (!busy) return true;
        if (landed && deltaY) {
          const p = push(acc, deltaY);
          acc = p;
          if (p.pass) {
            pass();
            return true;
          }
        }
        if (event.cancelable) event.preventDefault();
        return false;
      },
    });
    lenis.current = l;

    const steps = () => [sec.offsetTop, sec.offsetTop + s1.offsetTop] as const;
    const next = (from: number, to: number) => nextStep(from, to, ...steps());
    /* calls `done` once input has been quiet for SETTLE_MS, unless another run started */
    const whenQuiet = (id: number, done: () => void) => {
      const idle = Date.now() - lastInput;
      if (id !== run) return;
      if (idle < SETTLE_MS)
        return void setTimeout(() => whenQuiet(id, done), SETTLE_MS - idle);
      done();
    };
    const go = (p: number) => {
      const id = ++run;
      busy = true;
      landed = passing = false;
      l.scrollTo(p, {
        lock: true,
        force: true,
        duration: STEP_S,
        immediate: still_.current,
        onComplete: () => {
          landed = true;
          acc = { dir: 0, px: 0 };
          whenQuiet(id, () => {
            busy = false;
            last = l.animatedScroll;
          });
        },
      });
    };
    const pass = () => {
      const id = ++run;
      busy = false;
      passing = true;
      last = l.animatedScroll;
      whenQuiet(id, () => {
        passing = false;
        last = l.animatedScroll;
        const p = inGap(last, ...steps());
        if (p !== null) go(p);
      });
    };

    l.on("scroll", () => {
      if (!busy && !anchoring && !passing && l.isScrolling !== "native") {
        const p = next(last, l.targetScroll);
        if (p !== null) return go(p);
      }
      last = l.animatedScroll;
    });

    const onKey = (e: KeyboardEvent) => {
      const dir = KEYS[e.key];
      if (!dir || (e.target as Element).closest(TYPING)) return;
      lastInput = Date.now();
      if (passing) return;
      const sign = e.key === " " && e.shiftKey ? -1 : dir;
      const d = e.key.startsWith("Arrow") ? 40 : innerHeight * 0.8;
      if (busy) {
        const p = landed ? (acc = push(acc, sign * d)) : null;
        if (!p?.pass) return e.preventDefault();
        return pass(); // held key: let this press scroll natively
      }
      const a = l.animatedScroll;
      const p = next(a, a + sign * d);
      if (p === null) return;
      e.preventDefault();
      go(p);
    };
    /* own the in-page anchors: Lenis' anchor option doesn't cancel the native jump */
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest<HTMLAnchorElement>(
        'a[href^="#"]',
      );
      const el = a && document.getElementById(a.hash.slice(1));
      if (!el) return;
      e.preventDefault();
      anchoring = true;
      l.scrollTo(el, {
        force: true,
        immediate: still_.current,
        onComplete: () => {
          anchoring = false;
          last = l.animatedScroll;
          const f = el.closest("section") ?? el;
          if (!f.hasAttribute("tabindex")) f.tabIndex = -1;
          f.focus({ preventScroll: true });
        },
      });
    };
    addEventListener("keydown", onKey);
    addEventListener("click", onClick);
    return () => {
      removeEventListener("keydown", onKey);
      removeEventListener("click", onClick);
      l.destroy();
      lenis.current = null;
    };
  }, []);

  useEffect(() => {
    still_.current = still;
    if (lenis.current) lenis.current.options.lerp = still ? 1 : 0.1;
  }, [still]);

  /* scroll → step */
  useEffect(() => {
    const read = () => {
      const r = section.current?.getBoundingClientRect();
      if (!r) return;
      const vh = innerHeight;
      setStep(r.top > vh * 0.5 ? -1 : -r.top < vh * 0.5 ? 0 : 1);
      stage.current?.style.setProperty("--lift", `${clamp(r.top, 0, vh)}px`);
      document.documentElement.toggleAttribute(
        "data-scrolled",
        -r.top > vh + 4,
      );
    };
    read();
    addEventListener("scroll", read, { passive: true });
    return () => removeEventListener("scroll", read);
  }, []);

  /* once open, random commits flicker a shade and settle back (only while on screen) */
  useEffect(() => {
    const box = grid.current;
    if (step !== 1 || still || !box) return;
    const cells = box.children;
    const lit = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
    const id = setInterval(() => {
      const r = box.getBoundingClientRect();
      if (document.hidden || r.bottom < 0 || r.top > innerHeight) return;
      for (let n = 0; n < 3; n++) {
        const i = Math.floor(Math.random() * G.level.length);
        const el = cells[i] as HTMLElement;
        if (lit.has(el) || el.dataset.l !== String(G.level[i])) continue; // still drawing
        el.dataset.l = String(twinkle(G, i));
        lit.set(
          el,
          setTimeout(() => {
            el.dataset.l = String(G.level[i]);
            lit.delete(el);
          }, FLICKER),
        );
      }
    }, TICK);
    return () => {
      clearInterval(id);
      lit.forEach((t, el) => {
        clearTimeout(t);
        el.dataset.l = String(G.level[[...cells].indexOf(el)]);
      });
    };
  }, [step, still, G]);

  /* step → grid draw + count-up */
  useEffect(() => {
    const cells = grid.current?.children;
    const paint = (d: number) => {
      if (!cells) return;
      levelsAt(G, d).forEach((lv, i) => {
        (cells[i] as HTMLElement).dataset.l = String(lv);
      });
    };
    const show = (i: number, v: number) => {
      const el = values.current[i];
      if (el) el.textContent = formatStat(v, stats[i].format, locale);
    };
    const rafs: number[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    /* frame(p) gets nothing until `delay` has passed, then p runs 0→1 over `dur` */
    const animate = (
      delay: number,
      dur: number,
      frame: (t: number) => void,
    ) => {
      const k = rafs.length;
      const t0 = performance.now() + delay;
      const tick = (now: number) => {
        if (now >= t0) frame(clamp((now - t0) / dur, 0, 1));
        if (now < t0 + dur) rafs[k] = requestAnimationFrame(tick);
      };
      rafs[k] = requestAnimationFrame(tick);
    };

    if (step === 1) {
      if (still) {
        paint(1);
        stats.forEach((st, i) => show(i, st.value));
      } else {
        animate(650, 700, (p) => paint(ease(p)));
        stats.forEach((st, i) =>
          animate(1050 + i * 60, 1000, (p) => show(i, st.value * easeOut(p))),
        );
      }
    } else {
      timer = setTimeout(
        () => {
          paint(0);
          stats.forEach((_, i) => show(i, 0));
        },
        still ? 0 : 500,
      );
    }
    return () => {
      clearTimeout(timer);
      rafs.forEach(cancelAnimationFrame);
    };
  }, [step, still, locale, stats, G]);

  const greet = t.raw("greet") as string[];
  const stepClass = step === 0 ? s.s0 : step === 1 ? s.s1 : "";

  return (
    <section
      ref={section}
      className={s.stack}
      id="stack"
      aria-label={t("label")}
    >
      <div
        ref={step1}
        className={s.anchor}
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
                <span className={s.w} style={{ "--i": i } as CSSProperties}>
                  {w}
                </span>
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
                    style={{ "--cols": G.cols } as CSSProperties}
                    role="img"
                    aria-label={t("graph")}
                  >
                    {Array.from({ length: G.cols * G.rows }, (_, i) => (
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
