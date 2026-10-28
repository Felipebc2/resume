import { DEFAULT_THEME, themes, type Theme } from "@/content/themes";

const KEY = "fbc2-theme";
const EVENT = "theme:change";

/** Inline in <head>: applies the saved theme (and language) before the first paint. */
export const bootScript = `var d=document.documentElement,t,l;try{t=localStorage.getItem("${KEY}");l=localStorage.getItem("fbc2-lang")}catch(e){}d.dataset.theme=${JSON.stringify(themes.map((x) => x.id))}.indexOf(t)<0?"${DEFAULT_THEME}":t;if(l==="pt")d.lang="pt-BR"`;

export const getTheme = () =>
  (document.documentElement.dataset.theme ?? DEFAULT_THEME) as Theme;

export const onTheme = (cb: () => void) => {
  addEventListener(EVENT, cb);
  return () => removeEventListener(EVENT, cb);
};

let colors: Record<string, string> | undefined;

export function setTheme(id: Theme, still: boolean) {
  try {
    localStorage.setItem(KEY, id);
  } catch {}
  const go = () => {
    document.documentElement.dataset.theme = id;
    colors = undefined;
    dispatchEvent(new Event(EVENT));
  };
  if (!still && document.startViewTransition) document.startViewTransition(go);
  else go();
}

type Token =
  "bg" | "fg" | "dim" | "l1" | "l2" | "l3" | "l4" | "sig" | "action" | "cover";

/** Canvas can't read CSS variables, so it asks here. Mono returns each canvas's original colour, so nothing shifts. */
export function themeColor(token: Token, mono: string) {
  if (getTheme() === "mono") return mono;
  if (!colors) {
    const cs = getComputedStyle(document.documentElement);
    colors = {};
    for (const k of [
      "bg",
      "fg",
      "dim",
      "l1",
      "l2",
      "l3",
      "l4",
      "sig",
      "action",
      "cover",
    ])
      colors[k] = cs.getPropertyValue(`--color-${k}`).trim();
  }
  return colors[token] || mono;
}
