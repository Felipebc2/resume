"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { trophies, type EntryId } from "@/content/experience";
import { useStill } from "@/lib/motion";
import { themeColor } from "@/lib/theme";
import type { Select } from "./Bento";
import { useFrames, useRepaint } from "./useFrames";
import s from "./Experience.module.css";

/** a particle springs towards its glyph point (t) or, on burst, its ring point (b) */
type P = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  bx: number;
  by: number;
};
type Shelf = { cv: HTMLCanvasElement; size: number; pts: P[] }[];

/** sample the glyph on a 100×100 grid every 3px; reuse old particles so a resize doesn't restart the swarm */
function sample(cv: HTMLCanvasElement, glyph: string, old: P[] = []) {
  const off = document.createElement("canvas");
  off.width = off.height = 100;
  const o = off.getContext("2d")!;
  o.fillStyle = "#fff";
  o.textAlign = "center";
  o.textBaseline = "middle";
  o.font = `400 ${glyph.length > 1 ? 56 : 82}px ${getComputedStyle(cv).fontFamily}`;
  o.fillText(glyph, 50, 54);
  const d = o.getImageData(0, 0, 100, 100).data;
  const pts: P[] = [];
  for (let y = 0; y < 100; y += 3)
    for (let x = 0; x < 100; x += 3) {
      if (d[(y * 100 + x) * 4 + 3] <= 128) continue;
      const p = old[pts.length] ?? {
        x: Math.random(),
        y: Math.random(),
        vx: 0,
        vy: 0,
      };
      const a = Math.random() * Math.PI * 2;
      const r = 0.42 + Math.random() * 0.24;
      pts.push({
        ...p,
        tx: x / 100,
        ty: y / 100,
        bx: 0.5 + Math.cos(a) * r,
        by: 0.5 + Math.sin(a) * r,
      });
    }
  return pts;
}

export function Trophies({
  active,
  select,
}: {
  active: EntryId;
  select: Select;
}) {
  const t = useTranslations("Experience");
  const still = useStill();
  const [burst, setBurst] = useState<number | null>(null);
  const shelfEl = useRef<HTMLDivElement>(null);
  const shelf = useRef<Shelf>([]);

  useRepaint(shelfEl, () => {
    const cvs = shelfEl.current?.querySelectorAll("canvas") ?? [];
    shelf.current = [...cvs].map((cv, i) => {
      const size = Math.round(
        cv.getBoundingClientRect().width * Math.min(devicePixelRatio || 1, 2),
      );
      cv.width = cv.height = size;
      return {
        cv,
        size,
        pts: sample(cv, trophies[i].glyph, shelf.current[i]?.pts),
      };
    });
  });

  useFrames(shelfEl, () =>
    shelf.current.forEach(({ cv, size, pts }, i) => {
      if (!size) return;
      const on = burst === i;
      const ctx = cv.getContext("2d")!;
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = on
        ? "rgba(233,233,234,.25)"
        : themeColor("fg", "#e9e9ea");
      const sz = Math.max(1.5, size / 62);
      for (const p of pts) {
        const tx = on ? p.bx : p.tx;
        const ty = on ? p.by : p.ty;
        if (still) {
          p.x = tx;
          p.y = ty;
        } else {
          p.vx = (p.vx + (tx - p.x) * 0.06) * 0.82;
          p.vy = (p.vy + (ty - p.y) * 0.06) * 0.82;
          p.x += p.vx;
          p.y += p.vy;
        }
        ctx.fillRect(p.x * size - sz / 2, p.y * size - sz / 2, sz, sz);
      }
    }),
  );

  return (
    <div className={`${s.xb} ${s.trophy}`}>
      <div className={s.head}>
        <span>{t("trophyHead")}</span>
        <span>{t("trophyHint")}</span>
      </div>
      <div ref={shelfEl} className={s.shelf}>
        {trophies.map(({ id }, i) => {
          const open = () => {
            setBurst(i);
            select(id);
          };
          const close = () => setBurst((b) => (b === i ? null : b));
          return (
            <button
              key={id}
              type="button"
              className={`${s.tr} ${id === active ? s.act : ""} ${burst === i ? s.burst : ""}`}
              aria-label={`${t(`trophies.${id}.cap`)}. ${t(`trophies.${id}.sub`)}`}
              onPointerEnter={open}
              onPointerLeave={close}
              onFocus={open}
              onBlur={close}
              onClick={() => (burst === i ? close() : open())}
            >
              <canvas aria-hidden="true" />
              <span className={s.rv} aria-hidden="true">
                <b>{t(`trophies.${id}.name`)}</b>
                <span>{t(`trophies.${id}.sub`)}</span>
              </span>
              <span className={s.cap}>{t(`trophies.${id}.cap`)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
