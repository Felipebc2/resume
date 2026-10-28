"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { onTheme, themeColor } from "@/lib/theme";
import type { Item } from "./useItems";
import s from "./Projects.module.css";

const hash = (str: string) => {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
/** a dot field seeded by the project id, on a 600 × 260 canvas at 2x */
function paint(c: HTMLCanvasElement, id: string) {
  const ctx = c.getContext("2d");
  if (!ctx) return;
  let a = (hash(id) % 2147483646) + 1;
  const r = () => (a = (a * 16807) % 2147483647) / 2147483647;
  const ox = r(),
    oy = r(),
    fq = 2 + r() * 4,
    mode = Math.floor(r() * 3);
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.clearRect(0, 0, 600, 260);
  ctx.fillStyle = themeColor("cover", "#3d3d43");
  ctx.beginPath();
  for (let y = 0; y < 26; y++)
    for (let x = 0; x < 72; x++) {
      const u = x / 60,
        v = y / 26;
      const f =
        mode === 0
          ? Math.sin((u + ox) * fq * 3) * Math.cos((v + oy) * fq * 2)
          : mode === 1
            ? Math.sin(Math.hypot(u - ox, (v - oy) * 0.5) * fq * 8)
            : Math.sin((u + v * 0.6 + ox) * fq * 4);
      const t = (f + 1) / 2;
      if (t <= 0.25) continue;
      const cx = x * 10 + 5,
        cy = y * 10 + 5;
      ctx.moveTo(cx + t * 3.4, cy);
      ctx.arc(cx, cy, t * 3.4, 0, Math.PI * 2);
    }
  ctx.fill();
}

/** placeholder art until the real image or video lands */
export function Cover({ item, word = true }: { item: Item; word?: boolean }) {
  const t = useTranslations("Projects.media");
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = () => ref.current && paint(ref.current, item.id);
    draw();
    return onTheme(draw);
  }, [item.id]);

  return (
    <span
      className={`${s.cover} ${item.media === "video" ? s.vid : ""}`}
      aria-hidden="true"
    >
      <canvas ref={ref} width={1200} height={520} />
      {item.media && (
        <span className={item.media === "video" ? s.play : s.mtag}>
          {t(item.media)}
        </span>
      )}
      {word && <span className={s.word}>{item.art}</span>}
    </span>
  );
}
