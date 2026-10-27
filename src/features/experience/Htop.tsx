"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { academic, type EntryId } from "@/content/experience";
import { clamp } from "@/lib/math";
import { useStill } from "@/lib/motion";
import type { Select } from "./Bento";
import { mi, procs, span, type Proc } from "./entries";
import { useFrames } from "./useFrames";
import { useEntryText } from "./useEntryText";
import s from "./Experience.module.css";

const BAR = 24;
const bar = (v: number) => {
  const n = Math.round(v * BAR);
  return "|".repeat(n) + " ".repeat(BAR - n);
};
/** decorative CPU meters, a slow wobble */
const meters = (t: number) => [
  0.6 + 0.16 * Math.sin(t / 900),
  0.34 + 0.12 * Math.sin(t / 1300 + 1),
];
const running = (p: Proc) => p.end === null;
const COLS = [66, 78, 96, 70, 74];

export function Htop({
  active,
  select,
  now,
}: {
  active: EntryId;
  select: Select;
  now: number;
}) {
  const { t, fmt } = useEntryText(now);
  const still = useStill();
  const [showAll, setShowAll] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const meterEls = useRef<(HTMLElement | null)[]>([]);
  const cpuEls = useRef<(HTMLElement | null)[]>([]);
  const rv = useRef({ target: 0, now: 0 });

  const shown = procs.filter((p) => showAll || running(p));
  const up = span(mi(academic.start), null, now);
  const cmd = ({ entry: e }: Proc) =>
    e.kind === "work"
      ? `${e.id} --role="${e.cmd}" --site=${e.place === "rem" ? "remote" : "bsb"}`
      : e.kind === "lab"
        ? `${e.id} --${e.type}${e.rank ? ` --result=${t("rank", { rank: e.rank })}` : ""}`
        : `${e.id} --degree=software-engineering --semester=${academic.semester}`;

  /* scroll reveal: the box peeks in and opens up as it scrolls into view */
  useEffect(() => {
    const read = () => {
      const r = host.current?.getBoundingClientRect();
      if (r)
        rv.current.target = clamp(
          (innerHeight - r.top) / Math.max(1, r.height * 1.05),
          0,
          1,
        );
    };
    read();
    addEventListener("scroll", read, { passive: true });
    addEventListener("resize", read);
    return () => {
      removeEventListener("scroll", read);
      removeEventListener("resize", read);
    };
  }, []);

  useFrames(
    host,
    (time) => {
      const r = rv.current;
      r.now = still ? r.target : r.now + (r.target - r.now) * 0.12;
      host.current?.style.setProperty("--rv", r.now.toFixed(3));
      if (still) return;
      meters(time).forEach((v, i) => {
        const el = meterEls.current[i];
        if (!el) return;
        el.firstChild!.textContent = bar(v);
        el.lastChild!.textContent = `${Math.round(v * 100)}%`;
      });
      cpuEls.current.forEach((c, i) => {
        if (c)
          c.textContent = (
            8 +
            22 * Math.abs(Math.sin(time / 700 + i * 1.7))
          ).toFixed(1);
      });
    },
    (visible) => {
      /* off screen the box is either fully above (open) or below (closed) */
      if (!visible)
        host.current?.style.setProperty("--rv", String(rv.current.target));
      rv.current.now = rv.current.target;
    },
  );

  const onKey = (e: KeyboardEvent) => {
    const i = shown.findIndex((p) => p.id === active);
    if (e.key === "ArrowDown")
      select(shown[Math.min(shown.length - 1, i + 1)].id);
    else if (e.key === "ArrowUp") select(shown[Math.max(0, i - 1)].id);
    else if (e.key === "F4") setShowAll((v) => !v);
    else return;
    e.preventDefault();
  };

  const [c1, c2] = meters(0);
  const meter = (label: string, v: number, i: number) => (
    <div className={s.meter}>
      <span className={s.l}>{label}</span>
      <span className={s.b}>[</span>
      <span ref={(el) => void (meterEls.current[i] = el)} className={s.f}>
        <span>{bar(v)}</span>
        <span className={s.v}>{Math.round(v * 100)}%</span>
      </span>
      <span className={s.b}>]</span>
    </div>
  );

  let cpu = 0;
  return (
    <div
      ref={host}
      className={`${s.xb} ${s.htop}`}
      tabIndex={0}
      aria-label={t("htopLabel")}
      onKeyDown={onKey}
    >
      <div className={s.head}>
        <span>{t.rich("htopHead", { b: (c) => <b>{c}</b> })}</span>
        <span>{t("htopHint")}</span>
      </div>
      <div className={s.top}>
        {meter(t("building"), c1, 0)}
        <div className={s.info}>
          {t.rich("tasks", {
            b: (c) => <b>{c}</b>,
            total: procs.length,
            running: procs.filter(running).length,
          })}
        </div>
        {meter(t("learning"), c2, 1)}
        <div className={s.info}>
          {t.rich("uptime", {
            b: (c) => <b>{c}</b>,
            ...up,
            since: fmt(academic.start),
          })}
        </div>
      </div>
      <div className={s.scroll}>
        <table className={s.ptable}>
          <colgroup>
            {COLS.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
            <col />
          </colgroup>
          <thead>
            <tr>
              {(["pid", "user", "state", "cpu", "time", "cmd"] as const).map(
                (k) => (
                  <th key={k}>{t(`cols.${k}`)}</th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => {
              const run = running(p);
              const n = span(p.start, p.end, now);
              const rank =
                "rank" in p.entry && p.entry.rank
                  ? ` ${t("rank", { rank: p.entry.rank })}`
                  : "";
              const i = run ? cpu++ : -1;
              return (
                <tr
                  key={p.id}
                  className={p.id === active ? s.act : undefined}
                  onPointerEnter={() => select(p.id)}
                  onClick={() => {
                    select(p.id);
                    host.current?.focus({ preventScroll: true });
                  }}
                >
                  <td>{p.pid}</td>
                  <td>felipe</td>
                  <td>
                    {run ? (
                      <span className={s.r}>R</span>
                    ) : (
                      <span className={s.x}>
                        {p.entry.kind === "lab" ? `DONE${rank}` : "EXIT 0"}
                      </span>
                    )}
                  </td>
                  <td
                    ref={
                      run ? (el) => void (cpuEls.current[i] = el) : undefined
                    }
                  >
                    {run ? "12.0" : "0.0"}
                  </td>
                  <td>
                    {n.y ? `${n.y}y` : ""}
                    {String(n.m).padStart(n.y ? 2 : 1, "0")}m
                  </td>
                  <td>{cmd(p)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className={s.fkeys}>
        <button type="button" onClick={() => setShowAll((v) => !v)}>
          <b>F4</b>
          {showAll ? t("showAll") : t("showRunning")}
        </button>
        <span className={s.note}>{t("cpuNote")}</span>
      </div>
    </div>
  );
}
