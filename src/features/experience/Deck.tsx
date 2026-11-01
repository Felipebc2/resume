"use client";

import { useRef } from "react";
import type { Art, EntryId } from "@/content/experience";
import { themeRgb } from "@/lib/theme";
import { entries } from "./entries";
import { useRepaint } from "./useFrames";
import { useEntryText, type Card } from "./useEntryText";
import s from "./Experience.module.css";

/** 8×8 ordered-dither thresholds */
const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36,
  14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23,
  61, 29, 53, 21,
];
const PX = 3;

/** globe in white: rim, two meridians, the axis and three parallels; sizes are for a 520×390 art */
function globe(o: CanvasRenderingContext2D, w: number, h: number) {
  const k = h / 390;
  const r = h * 0.38;
  const cx = w / 2,
    cy = h / 2;
  o.strokeStyle = "#fff";
  o.lineWidth = 22 * k;
  o.beginPath();
  o.arc(cx, cy, r, 0, Math.PI * 2);
  o.stroke();
  o.lineWidth = 16 * k;
  o.beginPath();
  for (const rx of [0.45, 0.85]) {
    o.moveTo(cx + r * rx, cy);
    o.ellipse(cx, cy, r * rx, r, 0, 0, Math.PI * 2);
  }
  o.moveTo(cx, cy - r);
  o.lineTo(cx, cy + r);
  for (const f of [-0.5, 0, 0.5]) {
    const half = r * Math.sqrt(1 - f * f);
    o.moveTo(cx - half, cy + f * r);
    o.lineTo(cx + half, cy + f * r);
  }
  o.stroke();
}

/** card art: the entry's label (or pictogram) over a radial glow, 1-bit dithered at 3px cells */
function paintArt(cv: HTMLCanvasElement, art: Art, seed: number) {
  const r = cv.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const w = Math.ceil(r.width / PX);
  const h = Math.ceil(r.height / PX);
  cv.width = w;
  cv.height = h;
  const o = cv.getContext("2d")!;
  const g = o.createRadialGradient(
    w * (0.25 + (seed % 4) * 0.12),
    h * 0.3,
    2,
    w * 0.5,
    h * 0.5,
    Math.max(w, h) * 0.8,
  );
  g.addColorStop(0, "#8e8e8e");
  g.addColorStop(1, "#040404");
  o.fillStyle = g;
  o.fillRect(0, 0, w, h);
  if (typeof art === "string") {
    const family = getComputedStyle(cv).fontFamily;
    let fs = Math.min(h * 0.5, (w * 0.9) / Math.max(1, art.length * 0.5));
    o.font = `400 ${Math.round(fs)}px ${family}`;
    /* long labels (ORBIT, SPRINT) shrink until they fit whole */
    const tw = o.measureText(art).width;
    if (tw > w * 0.86) {
      fs *= (w * 0.86) / tw;
      o.font = `400 ${Math.floor(fs)}px ${family}`;
    }
    o.fillStyle = "#fff";
    o.textAlign = "center";
    o.textBaseline = "middle";
    o.fillText(art, w / 2, h * 0.54);
  } else globe(o, w, h);
  const img = o.getImageData(0, 0, w, h);
  const ink = themeRgb("fg"),
    paper = themeRgb("panel");
  const d = img.data;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const k = (y * w + x) * 4;
      const l = (d[k] * 0.3 + d[k + 1] * 0.59 + d[k + 2] * 0.11) / 255;
      const on = l > (BAYER[(y % 8) * 8 + (x % 8)] + 0.5) / 64;
      [d[k], d[k + 1], d[k + 2]] = on ? ink : paper;
      d[k + 3] = 255;
    }
  o.putImageData(img, 0, 0);
}

export function Deck({ order, now }: { order: EntryId[]; now: number }) {
  const { t, card } = useEntryText(now);
  const deck = useRef<HTMLDivElement>(null);
  const n = entries.findIndex((e) => e.id === order[0]) + 1;

  useRepaint(deck, () =>
    deck.current
      ?.querySelectorAll("canvas")
      .forEach((cv, i) => paintArt(cv, entries[i].art, i)),
  );

  return (
    <div className={`${s.xb} ${s.deck}`}>
      <div className={s.head}>
        <span>{t("deckHead")}</span>
        <span>
          {String(n).padStart(2, "0")} / {entries.length}
        </span>
      </div>
      <div ref={deck} className={s.stackOf} aria-live="polite">
        {entries.map((e) => (
          <DeckCard
            key={e.id}
            depth={order.indexOf(e.id)}
            c={card(e)}
            artLabel={typeof e.art === "string" ? undefined : t("globe")}
          />
        ))}
      </div>
    </div>
  );
}

function DeckCard({
  depth,
  c,
  artLabel,
}: {
  depth: number;
  c: Card;
  /** pictograms carry meaning, so they are announced; text labels repeat the card */
  artLabel?: string;
}) {
  return (
    <article
      className={s.card}
      data-d={depth < 3 ? depth : "x"}
      aria-hidden={depth !== 0}
    >
      <div className={s.ct}>
        <div className={s.k}>{c.k}</div>
        <h3>{c.title}</h3>
        <div className={s.s}>{c.s}</div>
        <div className={s.m}>{c.m}</div>
        <ul>
          {c.pts.slice(0, 3).map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        {(c.tags.length > 0 || c.links.length > 0) && (
          <div className={s.tg}>
            {c.tags.map((x) => (
              <span key={x} className={s.chip}>
                {x}
              </span>
            ))}
            {c.links.map(([label, href]) => (
              <a
                key={href}
                className={s.chip}
                href={href}
                target="_blank"
                rel="noopener"
                tabIndex={depth === 0 ? undefined : -1}
              >
                {label}
              </a>
            ))}
          </div>
        )}
      </div>
      {artLabel ? (
        <canvas role="img" aria-label={artLabel} />
      ) : (
        <canvas aria-hidden="true" />
      )}
    </article>
  );
}
