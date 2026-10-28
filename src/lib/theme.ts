import { DEFAULT_THEME, themes, type Mode, type Theme } from "@/content/themes";

const KEY = "fbc2-theme";
const MODE = "fbc2-mode";
const EVENT = "theme:change";

/** Inline in <head>: applies the saved theme, mode (else the system's) and language before the first paint. */
export const bootScript = `var d=document.documentElement,t,m,l;try{t=localStorage.getItem("${KEY}");m=localStorage.getItem("${MODE}");l=localStorage.getItem("fbc2-lang")}catch(e){}d.dataset.theme=${JSON.stringify(themes.map((x) => x.id))}.indexOf(t)<0?"${DEFAULT_THEME}":t;d.dataset.mode=m==="light"||m==="dark"?m:matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";if(l==="pt")d.lang="pt-BR"`;

const root = () => document.documentElement;
export const getTheme = () => (root().dataset.theme ?? DEFAULT_THEME) as Theme;
export const getMode = () => (root().dataset.mode ?? "dark") as Mode;

export const onTheme = (cb: () => void) => {
  addEventListener(EVENT, cb);
  return () => removeEventListener(EVENT, cb);
};

export function setLook(look: { theme?: Theme; mode?: Mode }, still: boolean) {
  try {
    if (look.theme) localStorage.setItem(KEY, look.theme);
    if (look.mode) localStorage.setItem(MODE, look.mode);
  } catch {}
  const go = () => {
    if (look.theme) root().dataset.theme = look.theme;
    if (look.mode) root().dataset.mode = look.mode;
    for (const k in cache) delete cache[k as Token];
    dispatchEvent(new Event(EVENT));
  };
  if (!still && document.startViewTransition) document.startViewTransition(go);
  else go();
}

type Token =
  | "bg"
  | "panel"
  | "fg"
  | "dim"
  | "faint"
  | "line"
  | "l1"
  | "l3"
  | "cover"
  | "primary-text"
  | "secondary-text";

const cache: Partial<Record<Token, number[]>> = {};

/** Canvas can't read CSS variables (and the derived tokens are color-mix()), so a probe resolves them to rgb. */
export function themeRgb(token: Token) {
  let c = cache[token];
  if (!c) {
    const p = document.createElement("i");
    p.hidden = true;
    p.style.color = `var(--color-${token})`;
    document.body.append(p);
    const v = getComputedStyle(p).color;
    p.remove();
    const n = (v.match(/[\d.]+/g) ?? []).map(Number).slice(0, 3);
    c = cache[token] = v.startsWith("color(")
      ? n.map((x) => Math.round(x * 255))
      : n;
  }
  return c;
}

export function themeColor(token: Token, alpha = 1) {
  const [r, g, b] = themeRgb(token);
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}
