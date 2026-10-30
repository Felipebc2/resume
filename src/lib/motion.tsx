"use client";

import { useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const MotionContext = createContext(false);

const root = () => getComputedStyle(document.documentElement);
/** Motion tokens for WAAPI and rAF, read from tokens.css so JS shares the CSS scale: `ms("--d-3")` → 400. */
export const ms = (t: `--d-${1 | 2 | 3 | 4 | 5}`) => {
  // the CSS minifier rewrites 1100ms as 1.1s, so honour the unit
  const v = root().getPropertyValue(t).trim();
  return parseFloat(v) * (v.endsWith("ms") ? 1 : 1000);
};
export const ease = (t: "--ease-out" | "--ease-inout" | "--ease-pop") =>
  root().getPropertyValue(t).trim();
/** any other token, e.g. a radius for a keyframe */
export const token = (t: `--${string}`) => root().getPropertyValue(t).trim();

export const useStill = () => useContext(MotionContext);

/** live `matchMedia(query).matches`; `server` is the value during SSR and hydration */
export function useMedia(query: string, server: boolean) {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mq = matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => matchMedia(query).matches,
    () => server,
  );
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const prefersReduced = useMedia("(prefers-reduced-motion: reduce)", false);
  const [override, setStill] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const still = override ?? prefersReduced;
  const toast = prefersReduced && still && !dismissed;
  const t = useTranslations("Motion");

  useEffect(() => {
    document.documentElement.toggleAttribute("data-still", still);
  }, [still]);

  return (
    <MotionContext value={still}>
      {children}
      {toast && (
        <div
          role="status"
          className="fixed bottom-[calc(20px+env(safe-area-inset-bottom,0px))] left-1/2 z-70 flex w-[min(520px,calc(100%-32px))] -translate-x-1/2 items-center gap-(--s-4) rounded-(--r-m) border border-line-2 bg-block/92 py-(--s-4) pr-(--s-4) pl-(--s-5) text-(length:--t-body-s) text-fg"
        >
          <p className="m-0 flex-1">{t("toast")}</p>
          <button
            type="button"
            onClick={() => setStill(false)}
            className="cursor-pointer rounded-(--r-pill) bg-fg px-(--s-4) py-(--s-2) font-semibold whitespace-nowrap text-bg"
          >
            {t("enable")}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label={t("dismiss")}
            className="cursor-pointer px-(--s-2) py-(--s-1) text-(length:--t-body-l) text-dim"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      )}
    </MotionContext>
  );
}
