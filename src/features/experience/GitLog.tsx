"use client";

import { useRef, useState, type CSSProperties } from "react";
import type { EntryId } from "@/content/experience";
import type { Select } from "./Bento";
import { entries, entryDate } from "./entries";
import { useRepaint } from "./useFrames";
import { useEntryText } from "./useEntryText";
import s from "./Experience.module.css";

const FILTERS = ["all", "work", "lab"] as const;
type Filter = (typeof FILTERS)[number];
/** x of the main and lab lanes */
const XM = 22;
const XL = 42;

const labIdx = entries.flatMap((e, i) => (e.kind === "lab" ? [i] : []));

export function GitLog({
  active,
  select,
  now,
}: {
  active: EntryId;
  select: Select;
  now: number;
}) {
  const { t, short, title } = useEntryText(now);
  const [filter, setFilter] = useState<Filter>("all");
  const [ys, setYs] = useState<number[]>([]);
  const list = useRef<HTMLOListElement>(null);

  useRepaint(list, () => {
    const rows = [...(list.current?.children ?? [])] as HTMLElement[];
    setYs(rows.map((li) => li.offsetTop + li.offsetHeight / 2));
  });

  const yH = ys[0];
  const yI = ys.at(-1);
  const yT = ys[labIdx[0]];
  const yB = ys[labIdx.at(-1)!];

  return (
    <div className={`${s.xb} ${s.git}`}>
      <div className={s.head}>
        <span>{t.rich("gitPrompt", { b: (c) => <b>{c}</b> })}</span>
        <div className={s.seg} role="group" aria-label={t("filter")}>
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {t(`filters.${f}`)}
            </button>
          ))}
        </div>
      </div>
      <div className={s.gitBody}>
        {yI !== undefined && (
          <svg className={s.gitSvg} aria-hidden="true">
            <path pathLength={1} d={`M${XM},${yH} L${XM},${yI}`} />
            <path
              pathLength={1}
              className={s.lab}
              d={`M${XM},${yI} C${XM},${yI - 30} ${XL},${yB + 30} ${XL},${yB} L${XL},${yT} C${XL},${yT - 26} ${XM},${yH + 26} ${XM},${yH}`}
            />
            {entries.map((e, i) => (
              <circle
                key={e.id}
                cx={e.kind === "lab" ? XL : XM}
                cy={ys[i]}
                r={e.kind === "head" ? 6 : 4.5}
                className={`${e.kind === "lab" ? s.lab : ""} ${e.id === active ? s.on : ""}`}
                style={{ "--delay": `${0.2 + i * 0.06}s` } as CSSProperties}
              />
            ))}
          </svg>
        )}
        <ol ref={list} className={s.commits}>
          {entries.map((e) => {
            const date = entryDate(e);
            const badge =
              "rank" in e && e.rank ? t("rank", { rank: e.rank }) : null;
            const off =
              filter !== "all" && (filter === "lab") !== (e.kind === "lab");
            const pre = e.kind === "lab" ? e.type : e.kind;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  className={`${s.xc} ${e.id === active ? s.act : ""} ${off ? s.dim : ""}`}
                  onPointerEnter={() => select(e.id)}
                  onFocus={() => select(e.id)}
                  onClick={() => select(e.id)}
                >
                  <span />
                  <span className={s.t}>
                    <span className={s.pre}>{t(`pre.${pre}`)}</span>
                    <b>{title(e)}</b>
                    {badge && <span className={s.badge}>{badge}</span>}
                  </span>
                  <span className={s.d}>{date ? short(date) : t("now")}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
