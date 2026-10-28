"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { signature } from "@/content/signature";
import { useStill } from "@/lib/motion";
import { useFrames, useRepaint } from "../experience/useFrames";
import { epicycles, tip } from "./fourier";
import s from "./Contact.module.css";

/** epicycles drawn, and how long the pen takes */
const K = 40;
const DUR = 1500;
const INK = "#e9e9ea";
const BG = "#0c0c0d";

type Pt = [x: number, y: number, lift: boolean];
let series: ReturnType<typeof epicycles> | undefined;

/** The signature traced by its own Fourier series the first time it comes into view; replay restarts it. */
export function Signature() {
  const t = useTranslations("Contact.signature");
  const still = useStill();
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const run = useRef({ step: 0, el: 0, last: 0, trail: [] as Pt[] });
  const dirty = useRef(true);

  const ink = (ctx: CanvasRenderingContext2D, pts: Pt[], f: Frame) => {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.beginPath();
    let up = true;
    for (const [x, y, lift] of pts) {
      if (lift) up = true;
      else if (up) {
        ctx.moveTo(f.cx + x * f.sc, f.cy + y * f.sc);
        up = false;
      } else ctx.lineTo(f.cx + x * f.sc, f.cy + y * f.sc);
    }
    ctx.stroke();
  };

  const draw = (dt: number) => {
    const c = cv.current,
      ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    series ??= epicycles(signature);
    const { terms, jumps, M, N } = series;
    const W = c.clientWidth,
      H = c.clientHeight;
    const f = { sc: Math.min(W, H) * 0.86, cx: W / 2, cy: H / 2 };
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    const at = (i: number): Pt => [...tip(terms, K, i, N), jumps.has(i)];

    if (still)
      return ink(
        ctx,
        Array.from({ length: M }, (_, i) => at(i)),
        f,
      );

    const r = run.current;
    r.el = Math.min(DUR, r.el + dt);
    const goal = Math.min(M, Math.floor((r.el / DUR) * M));
    while (r.step < goal - 1) r.trail.push(at(r.step++));
    if (r.step < M) {
      /* the arms: each circle rides on the tip of the one before */
      const tt = (r.step / N) * 2 * Math.PI;
      let x = 0,
        y = 0;
      ctx.strokeStyle = "rgba(233,233,234,.15)";
      ctx.lineWidth = 1;
      for (let i = 0; i < K; i++) {
        const e = terms[i],
          nx = x + e.amp * Math.cos(e.f * tt + e.ph),
          ny = y + e.amp * Math.sin(e.f * tt + e.ph);
        ctx.beginPath();
        ctx.arc(f.cx + x * f.sc, f.cy + y * f.sc, e.amp * f.sc, 0, 2 * Math.PI);
        ctx.moveTo(f.cx + x * f.sc, f.cy + y * f.sc);
        ctx.lineTo(f.cx + nx * f.sc, f.cy + ny * f.sc);
        ctx.stroke();
        x = nx;
        y = ny;
      }
      const lift = jumps.has(r.step);
      r.trail.push([x, y, lift]);
      ctx.fillStyle = lift ? "rgba(255,255,255,.35)" : "#fff";
      ctx.beginPath();
      ctx.arc(f.cx + x * f.sc, f.cy + y * f.sc, 2.6, 0, 2 * Math.PI);
      ctx.fill();
      r.step++;
    }
    ink(ctx, r.trail, f);
  };

  useRepaint(box, () => {
    const c = cv.current,
      ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const d = Math.min(devicePixelRatio || 1, 2);
    c.width = Math.round(c.clientWidth * d);
    c.height = Math.round(c.clientHeight * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    dirty.current = true;
  });
  useEffect(() => {
    dirty.current = true;
  }, [still]);

  /* frames only while drawing; a finished (or still) signature repaints on resize */
  useFrames(
    box,
    (now) => {
      const r = run.current;
      const dt = r.last ? Math.min(50, now - r.last) : 16;
      r.last = now;
      if (!dirty.current && (still || r.step >= (series?.M ?? 1))) return;
      dirty.current = false;
      draw(dt);
    },
    () => {
      run.current.last = 0;
    },
    0.35,
  );

  const replay = () => {
    run.current = { step: 0, el: 0, last: 0, trail: [] };
  };

  return (
    <div ref={box} className={s.art}>
      <canvas ref={cv} role="img" aria-label={t("label")} />
      <span className={s.cap}>{t("caption", { k: K })}</span>
      {!still && (
        <button
          type="button"
          className={s.replay}
          aria-label={t("replay")}
          title={t("replay")}
          onClick={replay}
        >
          <svg viewBox="0 0 256 256" aria-hidden="true">
            <path d="M224,128a96,96,0,0,1-94.71,96H128A95.38,95.38,0,0,1,62.1,197.8a8,8,0,0,1,11-11.63A80,80,0,1,0,71.43,71.39a3.07,3.07,0,0,1-.26.25L44.59,96H72a8,8,0,0,1,0,16H24a8,8,0,0,1-8-8V56a8,8,0,0,1,16,0V85.8L60.25,60A96,96,0,0,1,224,128Z" />
          </svg>
        </button>
      )}
    </div>
  );
}

type Frame = { sc: number; cx: number; cy: number };
