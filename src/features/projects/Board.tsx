"use client";

import { useTranslations } from "next-intl";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { Filter } from "@/content/projects";
import { useStill } from "@/lib/motion";
import { Case, type CaseHandle } from "./Case";
import { Cover } from "./Cover";
import { match } from "./search";
import { Search, type Row } from "./Search";
import { useItems, type Item } from "./useItems";
import s from "./Projects.module.css";

/** Search bar + bento. The query and filter light up matching cards; any card or
    result opens its case, and a stack chip inside a case comes back as a query. */
export function Board() {
  const t = useTranslations("Projects");
  const still = useStill();
  const { projects, all } = useItems();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<{ it: Item; origin: HTMLElement } | null>(
    null,
  );
  const caseRef = useRef<CaseHandle>(null);
  const bar = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const grid = useRef<HTMLDivElement>(null);

  const q = query.trim();
  const view = useMemo(() => {
    const rows = all
      .filter((it) => filter === "all" || it.cat.includes(filter))
      .map((it) => ({
        it,
        m: match(it.name, [it.kind, it.year, it.line, ...it.stack], q),
      }))
      .filter((r): r is Row => !!r.m);
    return q ? rows.sort((a, b) => b.m.score - a.m.score) : rows;
  }, [all, filter, q]);
  const hits = q || filter !== "all" ? new Set(view.map((r) => r.it.id)) : null;

  const show = (it: Item, origin: HTMLElement) =>
    setOpen((o) => o ?? { it, origin });
  /* results without a card (lab notes) grow out of the search bar */
  const fromSearch = (it: Item) => {
    const card = grid.current?.querySelector<HTMLElement>(
      `[data-id="${it.id}"]`,
    );
    const from = card ?? bar.current;
    if (from) show(it, from);
  };

  /* ⌘K / Ctrl+K: close any case, bring the bar to the middle of the screen, focus it */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k") return;
      e.preventDefault();
      const go = () => {
        bar.current?.scrollIntoView({
          block: "center",
          behavior: still ? "auto" : "smooth",
        });
        input.current?.focus({ preventScroll: true });
      };
      if (caseRef.current) caseRef.current.close(go);
      else go();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [still]);

  const searchStack = (st: string) =>
    caseRef.current?.close(() => {
      setQuery(st);
      bar.current?.scrollIntoView({
        block: "center",
        behavior: still ? "auto" : "smooth",
      });
    });

  return (
    <div className={s.root}>
      <Search
        query={query}
        setQuery={setQuery}
        filter={filter}
        setFilter={setFilter}
        view={view}
        onOpen={fromSearch}
        bar={bar}
        input={input}
      />
      <div ref={grid} className={`${s.bento} ${hits ? s.filtering : ""}`}>
        {projects.map((it) => (
          <button
            key={it.id}
            type="button"
            data-id={it.id}
            aria-label={t("open", { name: it.name })}
            className={[
              s.card,
              it.media ? "" : s.flat,
              it.id === "normai" ? s.big : "",
              hits?.has(it.id) ? s.hit : "",
            ].join(" ")}
            style={
              {
                gridArea: it.id,
                /* the case grows out of this card, so the card steps aside meanwhile */
                visibility: open?.it.id === it.id ? "hidden" : undefined,
                "--mc": it.mob[0],
                "--mr": it.mob[1],
              } as CSSProperties
            }
            onClick={(e) => show(it, e.currentTarget)}
          >
            {it.badge && <span className={s.badge}>{it.badge}</span>}
            {it.media ? (
              <>
                <span className={s.media}>
                  <Cover item={it} />
                </span>
                <span className={s.meta}>
                  <span className={s.k}>
                    {it.kind} · {it.year}
                  </span>
                  <span className={s.name}>{it.name}</span>
                  <span className={s.line}>{it.line}</span>
                  <Tags list={it.stack} />
                </span>
              </>
            ) : (
              <>
                <span className={s.top}>
                  <span className={s.chip}>{it.kind.split(" · ")[0]}</span>
                  <span className={s.yr}>{it.year}</span>
                </span>
                <span className={s.mid}>
                  <span className={s.name}>{it.name}</span>
                  <span className={s.line}>{it.line}</span>
                </span>
                <Tags list={it.stack} />
              </>
            )}
          </button>
        ))}
      </div>
      {open && (
        <Case
          ref={caseRef}
          item={open.it}
          origin={open.origin}
          onClosed={() => setOpen(null)}
          onStack={searchStack}
        />
      )}
    </div>
  );
}

const Tags = ({ list }: { list: string[] }) => (
  <span className={s.tags}>
    {list.slice(0, 3).map((x) => (
      <span key={x} className={s.chip}>
        {x}
      </span>
    ))}
  </span>
);
