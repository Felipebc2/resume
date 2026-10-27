"use client";

import { useRef } from "react";
import { pins, type EntryId } from "@/content/experience";
import { clamp } from "@/lib/math";
import { useStill } from "@/lib/motion";
import { entries } from "./entries";
import { LAND } from "./land";
import { useFrames, useRepaint } from "./useFrames";
import { useEntryText } from "./useEntryText";
import s from "./Experience.module.css";

const BITS = LAND.rows.map((r) =>
  [...r]
    .map((h) => parseInt(h, 16).toString(2).padStart(4, "0"))
    .join("")
    .slice(0, LAND.W),
);
const TRIPS = ["bue", "sv"] as const;
const PINS = ["bsb", "bue", "sv"] as const;

type View = {
  w: number;
  h: number;
  dpr: number;
  land: HTMLCanvasElement | null;
};

/** equirectangular projection into the letterboxed land grid */
const project = (v: View, lat: number, lon: number) => {
  const cell = Math.min(v.w / LAND.W, v.h / LAND.H);
  const ox = (v.w - cell * LAND.W) / 2;
  const oy = (v.h - cell * LAND.H) / 2;
  return {
    x: ox + ((lon + 180) / 360) * cell * LAND.W,
    y: oy + ((LAND.LAT0 - lat) / (LAND.LAT0 - LAND.LAT1)) * cell * LAND.H,
    cell,
    ox,
    oy,
  };
};

export function DotMap({ active, now }: { active: EntryId; now: number }) {
  const { t, title } = useEntryText(now);
  const still = useStill();
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const view = useRef<View>({ w: 0, h: 0, dpr: 1, land: null });
  const t0 = useRef(0);

  const entry = entries.find((e) => e.id === active)!;
  const hot = "place" in entry ? entry.place : undefined;
  const here = hot
    ? entries.filter((e) => "place" in e && e.place === hot).length
    : 0;

  /* the land dots only change on resize, so they're drawn once into an offscreen canvas */
  useRepaint(box, () => {
    const c = cv.current;
    const r = box.current?.getBoundingClientRect();
    if (!c || !r) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    c.width = r.width * dpr;
    c.height = r.height * dpr;
    const land = document.createElement("canvas");
    land.width = c.width;
    land.height = c.height;
    const v: View = { w: r.width, h: r.height, dpr, land };
    const { cell, ox, oy } = project(v, 0, 0);
    const o = land.getContext("2d")!;
    o.scale(dpr, dpr);
    o.fillStyle = "#36363c";
    const rr = Math.max(0.7, cell * 0.28);
    BITS.forEach((row, y) => {
      for (let x = 0; x < LAND.W; x++)
        if (row[x] === "1") {
          o.beginPath();
          o.arc(ox + (x + 0.5) * cell, oy + (y + 0.5) * cell, rr, 0, 6.283);
          o.fill();
        }
    });
    view.current = v;
  });

  useFrames(
    box,
    (time) => {
      const v = view.current;
      const ctx = cv.current?.getContext("2d");
      if (!ctx || !v.land) return;
      const font = getComputedStyle(cv.current!).fontFamily;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, v.w * v.dpr, v.h * v.dpr);
      ctx.drawImage(v.land, 0, 0);
      ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);

      const home = project(v, pins.bsb.lat, pins.bsb.lon);
      const k = still ? 1 : clamp((time - t0.current) / 1600, 0, 1);
      TRIPS.forEach((p, i) => {
        const q = project(v, pins[p].lat, pins[p].lon);
        const mx = (home.x + q.x) / 2;
        const my =
          Math.min(home.y, q.y) - Math.hypot(q.x - home.x, q.y - home.y) * 0.35;
        const hl = hot === p;
        ctx.strokeStyle = hl ? "#f4f4f5" : "#7d7d83";
        ctx.lineWidth = hl ? 1.8 : 1.1;
        ctx.setLineDash([4, 5]);
        ctx.lineDashOffset = still ? 0 : -time / 60;
        ctx.beginPath();
        const steps = 40;
        const upto = Math.round(steps * clamp(k * 1.4 - i * 0.25, 0, 1));
        for (let n = 0; n <= upto; n++) {
          const u = n / steps;
          const x = (1 - u) ** 2 * home.x + 2 * (1 - u) * u * mx + u * u * q.x;
          const y = (1 - u) ** 2 * home.y + 2 * (1 - u) * u * my + u * u * q.y;
          if (n) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.stroke();
      });

      const remote = hot === "rem";
      const sc = v.w / 700;
      ctx.setLineDash([2, 6]);
      ctx.strokeStyle = remote
        ? "rgba(244,244,245,.9)"
        : "rgba(233,233,234,.28)";
      ctx.lineWidth = 1;
      [30, 52].forEach((r0, n) => {
        const r = r0 * sc + (still ? 0 : ((time / 50 + n * 13) % 26) * 0.3);
        ctx.beginPath();
        ctx.arc(home.x, home.y, r, 0, 6.283);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      PINS.forEach((p) => {
        const q = project(v, pins[p].lat, pins[p].lon);
        const hl = hot === p;
        ctx.fillStyle = hl ? "#fff" : "#c9c9ce";
        ctx.beginPath();
        ctx.arc(q.x, q.y, hl ? 5 : 3.5, 0, 6.283);
        ctx.fill();
        if (hl) {
          const pulse = still ? 0.5 : (time / 1300) % 1;
          ctx.strokeStyle = `rgba(244,244,245,${1 - pulse})`;
          ctx.beginPath();
          ctx.arc(q.x, q.y, 6 + pulse * 16, 0, 6.283);
          ctx.stroke();
        }
        const name = t(`places.${p}`);
        ctx.font = `500 ${hl ? 12 : 11}px ${font}`;
        ctx.fillStyle = hl ? "#fff" : "#8e8e94";
        const w = ctx.measureText(name).width;
        ctx.fillText(name, q.x + w + 14 > v.w ? q.x - w - 9 : q.x + 9, q.y - 8);
      });
      if (remote) {
        ctx.font = `500 11px ${font}`;
        ctx.fillStyle = "#fff";
        ctx.fillText(t("remote"), home.x + 40 * sc, home.y + 44 * sc);
      }
    },
    (visible) => {
      if (visible) t0.current = performance.now();
    },
  );

  return (
    <div className={`${s.xb} ${s.map}`}>
      <div className={s.head}>
        <span>{t("mapHead")}</span>
        <span>{t("mapHint")}</span>
      </div>
      <div ref={box} className={s.mapbox}>
        <canvas ref={cv} aria-hidden="true" />
        <div className={s.mapCap}>
          {hot ? (
            <>
              <b>{t(`places.${hot}`)}</b> ·{" "}
              {t("mapHere", { title: title(entry), count: here })}
            </>
          ) : (
            t("mapUnknown", { title: title(entry) })
          )}
        </div>
      </div>
    </div>
  );
}
