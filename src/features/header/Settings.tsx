"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { DEFAULT_THEME, themes, type Theme } from "@/content/themes";
import { useSetLang } from "@/lib/lang";
import { useStill } from "@/lib/motion";
import { getTheme, onTheme, setTheme } from "@/lib/theme";
import s from "./Header.module.css";

const Thumb = ({ c }: { c: (typeof themes)[number]["c"] }) => (
  <span
    className={s.th}
    style={{ background: c.bg, borderColor: c.line }}
    aria-hidden="true"
  >
    <span style={{ background: c.surface, borderColor: c.line }} />
    <span>
      {(
        [
          [70, c.text],
          [44, c.dim],
          [30, c.action],
        ] as const
      ).map(([w, bg]) => (
        <i key={w} style={{ width: `${w}%`, background: bg }} />
      ))}
    </span>
  </span>
);

/** Top-right menu: theme (collapsed to the current one) and the EN ⇄ PT switch. */
export function Settings() {
  const t = useTranslations("Settings");
  const locale = useLocale();
  const setLang = useSetLang();
  const still = useStill();
  const theme = useSyncExternalStore(onTheme, getTheme, () => DEFAULT_THEME);
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const cur = useRef<HTMLButtonElement>(null);
  const items = useRef<HTMLDivElement>(null);
  const current = themes.find((x) => x.id === theme) ?? themes[1];

  const close = (back = true) => {
    setOpen(false);
    setList(false);
    if (back) btn.current?.focus({ preventScroll: true });
  };

  /* Esc closes the list first, then the menu; a click outside closes without stealing focus */
  const onDoc = useEffectEvent((e: Event) => {
    const n = e.target as Node;
    if (e instanceof KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (!list) return close();
      setList(false);
      cur.current?.focus({ preventScroll: true });
    } else if (!pop.current?.contains(n) && !btn.current?.contains(n))
      close(false);
  });

  useEffect(() => {
    if (!open) return;
    cur.current?.focus({ preventScroll: true });
    if (!document.documentElement.hasAttribute("data-still"))
      pop.current?.animate(
        [
          { opacity: 0, transform: "translateY(-6px) scale(.97)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" },
      );
    const h = (e: Event) => onDoc(e);
    document.addEventListener("pointerdown", h);
    document.addEventListener("keydown", h);
    return () => {
      document.removeEventListener("pointerdown", h);
      document.removeEventListener("keydown", h);
    };
  }, [open]);

  useEffect(() => {
    if (!list) return;
    const id = setTimeout(
      () =>
        items.current
          ?.querySelector<HTMLElement>("[role=radio]")
          ?.focus({ preventScroll: true }),
      still ? 0 : 120,
    );
    return () => clearTimeout(id);
  }, [list, still]);

  const arrows = (e: ReactKeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const vis = [
      ...(items.current?.querySelectorAll<HTMLElement>("[role=radio]") ?? []),
    ];
    const i = vis.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    vis[
      (i + (e.key === "ArrowDown" ? 1 : vis.length - 1)) % vis.length
    ].focus();
  };

  const pick = (id: Theme) => {
    if (id !== theme) setTheme(id, still);
    setList(false);
    cur.current?.focus({ preventScroll: true });
  };

  return (
    <div className={s.tm}>
      <button
        ref={btn}
        type="button"
        className={`${s.tmBtn} ${open ? s.x : ""}`}
        aria-label={t("label")}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="settings"
        onClick={() => (open ? close() : setOpen(true))}
      >
        <svg viewBox="0 0 256 256" aria-hidden="true">
          <line x1="40" y1="64" x2="216" y2="64" />
          <line x1="40" y1="128" x2="216" y2="128" />
          <line x1="40" y1="192" x2="216" y2="192" />
        </svg>
      </button>

      <div
        ref={pop}
        id="settings"
        className={s.pop}
        role="dialog"
        aria-label={t("label")}
        hidden={!open}
      >
        <div className={s.sec}>
          <span>{t("theme")}</span>
          <span>{list ? "" : t("more", { count: themes.length - 1 })}</span>
        </div>
        <button
          ref={cur}
          type="button"
          className={s.cur}
          aria-expanded={list}
          aria-controls="settings-themes"
          aria-label={`${t("theme")}: ${current.name}`}
          onClick={() => setList(!list)}
        >
          <Thumb c={current.c} />
          <span>
            <span className={s.nm}>{current.name}</span>
            <span className={s.note}>{t(`themes.${current.id}`)}</span>
          </span>
          <span className={s.chev} aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path
                d="M2 4l4 4 4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </button>
        <div className={`${s.acc} ${list ? s.open : ""}`}>
          <div>
            <div
              ref={items}
              id="settings-themes"
              className={s.list}
              role="radiogroup"
              aria-label={t("theme")}
              onKeyDown={arrows}
            >
              {themes
                .filter((x) => x.id !== theme)
                .map((x, i) => (
                  <button
                    key={x.id}
                    type="button"
                    role="radio"
                    aria-checked={false}
                    tabIndex={list ? 0 : -1}
                    className={s.it}
                    style={{
                      transitionDelay:
                        list && !still ? `${0.06 + i * 0.04}s` : "0s",
                    }}
                    onClick={() => pick(x.id)}
                  >
                    <Thumb c={x.c} />
                    <span>
                      <span className={s.nm}>{x.name}</span>
                      <span className={s.note}>{t(`themes.${x.id}`)}</span>
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
        <div className={s.hr} />
        <div className={s.row}>
          <span>{t("lang")}</span>
          <span className={s.lng}>
            <span className={locale === "en" ? s.on : ""}>EN</span>
            <button
              type="button"
              role="switch"
              className={s.tg}
              aria-checked={locale === "pt"}
              aria-label={`${t("lang")}: ${t("langName")}`}
              onClick={() => setLang(locale === "en" ? "pt" : "en")}
            />
            <span className={locale === "pt" ? s.on : ""}>PT</span>
          </span>
        </div>
        <div className={s.ft}>
          <span>Esc</span>
          <span>{t("saved")}</span>
        </div>
      </div>
    </div>
  );
}
