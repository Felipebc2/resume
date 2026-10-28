"use client";

import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { NH, NW, type Item, type Node } from "./useItems";
import s from "./Projects.module.css";

/** stroke length for the draw-in, plus its start delay (a variable, so a box's hover fill stays instant) */
const draw = (len: number, delay: number) =>
  ({ "--len": Math.ceil(len), "--d": `${delay}s` }) as CSSProperties;
const at = (delay: number) => ({ transitionDelay: `${delay}s` });

/** architecture sketch: boxes draw in, then edges, labels and the dimension line */
export function Blueprint({
  item,
  drawn,
  onWhy,
}: {
  item: Item;
  drawn: boolean;
  onWhy: (n: Node) => void;
}) {
  const t = useTranslations("Projects.case");
  const nodes = item.nodes;
  const by = new Map(nodes.map((n) => [n.id, n]));
  const xs = nodes.map((n) => n.x),
    x0 = Math.min(...xs),
    x1 = Math.max(...xs) + NW;

  return (
    <div className={s.bpbox}>
      <svg
        className={`${s.bp} ${drawn ? s.drawn : ""}`}
        viewBox="0 0 1000 380"
        role="group"
        aria-label={t("arch", { name: item.name })}
      >
        <defs>
          <marker
            id="pj-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M0 0L10 5L0 10z" style={{ fill: "var(--color-dim)" }} />
          </marker>
        </defs>
        {nodes
          .filter((b) => b.from)
          .map((b, i) => {
            const a = by.get(b.from!)!;
            const flat = Math.abs(a.y - b.y) < 2;
            const x = a.x + NW / 2,
              y = a.y + NH / 2;
            const [d, len, lx, ly] = flat
              ? [
                  `M${a.x + NW} ${y} H${b.x - 6}`,
                  b.x - 6 - a.x - NW,
                  (a.x + NW + b.x) / 2,
                  y - 9,
                ]
              : [
                  `M${x} ${a.y + NH} V${b.y - 6}`,
                  b.y - 6 - a.y - NH,
                  x + 10,
                  (a.y + NH + b.y) / 2 + 4,
                ];
            return (
              <g key={b.id}>
                <path
                  d={d}
                  className={`${s.edge} ${s.draw}`}
                  markerEnd="url(#pj-arrow)"
                  style={draw(len, 0.3 + i * 0.18)}
                />
                {b.in && (
                  <text
                    x={lx}
                    y={ly}
                    className={`${s.elab} ${s.pop}`}
                    textAnchor={flat ? "middle" : "start"}
                    style={at(0.9 + i * 0.15)}
                  >
                    {b.in}
                  </text>
                )}
              </g>
            );
          })}
        {nodes.map((n, i) => (
          <g
            key={n.id}
            className={s.node}
            tabIndex={0}
            role="button"
            aria-label={n.label}
            onMouseEnter={() => onWhy(n)}
            onFocus={() => onWhy(n)}
          >
            <rect
              x={n.x}
              y={n.y}
              width={NW}
              height={NH}
              rx={4}
              className={s.draw}
              style={draw(2 * (NW + NH), i * 0.1)}
            />
            <text
              x={n.x + 14}
              y={n.y + 27}
              className={`${s.lb} ${s.pop}`}
              style={at(0.3 + i * 0.1)}
            >
              {n.label}
            </text>
            <text
              x={n.x + 14}
              y={n.y + 47}
              className={`${s.sb} ${s.pop}`}
              style={at(0.3 + i * 0.1)}
            >
              {n.sub}
            </text>
          </g>
        ))}
        <g className={s.pop} style={at(1.2)}>
          <path
            className={s.dim}
            d={`M${x0} 76 H${x1} M${x0} 68 V84 M${x1} 68 V84`}
          />
          <text className={s.dimt} x={(x0 + x1) / 2} y={62} textAnchor="middle">
            {t("path", { n: nodes.length })}
          </text>
          <g className={s.tb}>
            <rect x={740} y={330} width={240} height={40} />
            <line x1={880} y1={330} x2={880} y2={370} />
            <text className={s.t1} x={752} y={355}>
              {item.name.toUpperCase().slice(0, 14)}
            </text>
            <text x={892} y={355}>
              {t("rev")}
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}
