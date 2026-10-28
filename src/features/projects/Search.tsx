"use client";

import { useTranslations } from "next-intl";
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { filters, type Filter } from "@/content/projects";
import { ease, ms, useStill } from "@/lib/motion";
import type { Hit } from "./search";
import type { Item } from "./useItems";
import s from "./Projects.module.css";

export type Row = { it: Item; m: Hit };

const keep = (e: { preventDefault: () => void }) => e.preventDefault();
const hl = (str: string, idx: number[]) =>
  str.split("").map((c, j) => (idx.includes(j) ? <mark key={j}>{c}</mark> : c));

export function Search({
  query,
  setQuery,
  filter,
  setFilter,
  view,
  onOpen,
  bar,
  input,
}: {
  query: string;
  setQuery: (q: string) => void;
  filter: Filter;
  setFilter: (f: Filter) => void;
  view: Row[];
  onOpen: (it: Item) => void;
  bar: RefObject<HTMLDivElement | null>;
  input: RefObject<HTMLInputElement | null>;
}) {
  const t = useTranslations("Projects.search");
  const still = useStill();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const list = useRef<HTMLUListElement>(null);
  const tops = useRef<Map<string, number> | null>(null);
  const cur = Math.min(sel, Math.max(0, view.length - 1));
  const q = query.trim();

  /* rows that move glide to their new place, new rows rise in */
  useLayoutEffect(() => {
    const rows = [
      ...(list.current?.querySelectorAll<HTMLElement>("[data-id]") ?? []),
    ];
    if (!open) return void (tops.current = null);
    const prev = tops.current;
    tops.current = new Map(rows.map((r) => [r.dataset.id!, r.offsetTop]));
    if (!prev || still) return;
    rows.forEach((r) => {
      const b = prev.get(r.dataset.id!),
        a = r.offsetTop;
      if (b == null)
        r.animate(
          [
            { opacity: 0, transform: "translateY(5px)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: ms("--d-2"), easing: ease("--ease-out") },
        );
      else if (b !== a)
        r.animate(
          [{ transform: `translateY(${b - a}px)` }, { transform: "none" }],
          { duration: ms("--d-2"), easing: ease("--ease-out") },
        );
    });
  }, [view, open, still]);

  useEffect(() => {
    if (open)
      list.current
        ?.querySelector('[aria-selected="true"]')
        ?.scrollIntoView({ block: "nearest" });
  }, [cur, open]);

  const pick = (it: Item) => {
    setOpen(false);
    onOpen(it);
  };
  const type = (v: string) => {
    setQuery(v);
    setSel(0);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") setSel(Math.min(view.length - 1, cur + 1));
    else if (e.key === "ArrowUp") setSel(Math.max(0, cur - 1));
    else if (e.key === "Enter") {
      if (view[cur]) pick(view[cur].it);
    } else if (e.key === "Escape") {
      if (query) type("");
      else e.currentTarget.blur();
    } else return;
    e.preventDefault();
  };

  return (
    <div ref={bar} className={s.sbar}>
      <div className={s.row}>
        <label className={s.search}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={input}
            type="search"
            role="combobox"
            aria-label={t("label")}
            aria-expanded={open}
            aria-controls="pj-results"
            aria-autocomplete="list"
            aria-activedescendant={
              open && view[cur] ? `pj-opt-${view[cur].it.id}` : undefined
            }
            autoComplete="off"
            placeholder={t("placeholder")}
            value={query}
            onChange={(e) => type(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={onKey}
          />
          <kbd className={s.kbd}>⌘K</kbd>
        </label>
        <div className={s.filters}>
          {filters.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={k === filter}
              onMouseDown={keep}
              onClick={() => {
                setFilter(k);
                setSel(0);
              }}
            >
              {t(`filters.${k}`)}
            </button>
          ))}
        </div>
      </div>
      <div className={s.drop} hidden={!open}>
        <ul
          ref={list}
          id="pj-results"
          role="listbox"
          aria-label={t("label")}
          className={s.results}
        >
          {!view.length && (
            <li role="presentation" className={s.empty}>
              {t("empty")}
            </li>
          )}
          {view.map(({ it, m }, i) => (
            <Fragment key={it.id}>
              {!q && (i === 0 || view[i - 1].it.lab !== it.lab) && (
                <li role="presentation" className={s.group}>
                  {t(it.lab ? "groups.lab" : "groups.projects")}
                </li>
              )}
              <li
                id={`pj-opt-${it.id}`}
                role="option"
                aria-selected={i === cur}
                data-id={it.id}
                className={`${s.res} ${i === cur ? s.sel : ""}`}
                onMouseDown={keep}
                onMouseMove={() => i !== cur && setSel(i)}
                onClick={() => pick(it)}
              >
                <span className={s.ic}>{it.art.slice(0, 4)}</span>
                <span className={s.t}>
                  <b>{hl(it.name, m.idx)}</b>
                  <span>{it.line}</span>
                </span>
                <span className={s.y}>{it.year}</span>
              </li>
            </Fragment>
          ))}
        </ul>
        <div className={s.foot}>
          <span>{t("navigate")}</span>
          <span>{t("pick")}</span>
          <span>{t("clear")}</span>
          <span>{t("count", { n: view.length })}</span>
        </div>
      </div>
    </div>
  );
}
