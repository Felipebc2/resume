"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { firstEntry, type EntryId } from "@/content/experience";
import { Deck } from "./Deck";
import { DotMap } from "./DotMap";
import { entries } from "./entries";
import { GitLog } from "./GitLog";
import { Htop } from "./Htop";
import { Trophies } from "./Trophies";
import s from "./Experience.module.css";

export type Select = (id: EntryId) => void;

const ids = entries.map((e) => e.id);

/** One shared selection drives every cell: hovering a commit, trophy or process brings its card to the front of the deck. */
export function Bento({ now }: { now: number }) {
  const t = useTranslations("Experience");
  /* deck order, most recently selected first; order[0] is the active entry */
  const [order, setOrder] = useState<EntryId[]>(() => [
    firstEntry,
    ...ids.filter((id) => id !== firstEntry),
  ]);
  const select: Select = (id) =>
    setOrder((o) => (o[0] === id ? o : [id, ...o.filter((x) => x !== id)]));
  const grid = useRef<HTMLDivElement>(null);
  const fit = useRef<HTMLSpanElement>(null);

  /* cells rise in as they enter; the git graph draws once its cell shows.
     Cell classNames are static so React never wipes the classes added here. */
  useEffect(() => {
    const cells = [...(grid.current?.children ?? [])] as HTMLElement[];
    const io = new IntersectionObserver(
      (ents) =>
        ents.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          el.style.transitionDelay = `${(cells.indexOf(el) % 3) * 0.08}s`;
          el.classList.add(s.in);
          if (el.classList.contains(s.git)) el.classList.add(s.drawn);
          io.unobserve(el);
        }),
      { threshold: 0.12 },
    );
    cells.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  /* keep EXPERIENCE inside its column whatever the font metrics or locale */
  useEffect(() => {
    const c = fit.current;
    const cell = c?.closest("header");
    if (!c || !cell) return;
    const run = () => {
      c.style.fontSize = "";
      const max = parseFloat(getComputedStyle(c).fontSize);
      const avail = cell.clientWidth - 4;
      if (c.scrollWidth > avail)
        c.style.fontSize = `${Math.floor((max * avail) / c.scrollWidth)}px`;
    };
    const ro = new ResizeObserver(run);
    ro.observe(cell);
    document.fonts?.ready.then(run);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={grid} className={s.bento}>
      <header className={`${s.xb} ${s.title}`}>
        <h2 id="experience-title" className={s.xt}>
          <span className={s.a}>{t("titleA")}</span>
          <span className={s.b}>{t("titleB")}</span>
          <span ref={fit} className={s.c}>
            {t("titleC")}
          </span>
        </h2>
        <p className={s.sub}>{t.rich("sub", { b: (c) => <b>{c}</b> })}</p>
      </header>
      <Trophies active={order[0]} select={select} />
      <GitLog active={order[0]} select={select} now={now} />
      <Deck order={order} now={now} />
      <DotMap active={order[0]} now={now} />
      <Htop active={order[0]} select={select} now={now} />
    </div>
  );
}
