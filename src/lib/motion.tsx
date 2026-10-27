"use client";

import { useTranslations } from "next-intl";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type Motion = { still: boolean; setStill: (still: boolean) => void };

const MotionContext = createContext<Motion>({
  still: false,
  setStill: () => {},
});

export const useMotion = () => useContext(MotionContext);
export const useStill = () => useContext(MotionContext).still;

const QUERY = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => {
  const mq = matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export function MotionProvider({ children }: { children: ReactNode }) {
  const prefersReduced = useSyncExternalStore(
    subscribe,
    () => matchMedia(QUERY).matches,
    () => false,
  );
  const [override, setStill] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const still = override ?? prefersReduced;
  const toast = prefersReduced && still && !dismissed;
  const t = useTranslations("Motion");

  useEffect(() => {
    document.documentElement.toggleAttribute("data-still", still);
  }, [still]);

  return (
    <MotionContext value={{ still, setStill }}>
      {children}
      {toast && (
        <div
          role="status"
          className="fixed bottom-[calc(20px+env(safe-area-inset-bottom,0px))] left-1/2 z-70 flex w-[min(520px,calc(100%-32px))] -translate-x-1/2 items-center gap-3.5 rounded-[18px] border border-line-2 bg-block/92 py-3.5 pr-4 pl-5 text-sm text-[#d6d6dc]"
        >
          <p className="m-0 flex-1">{t("toast")}</p>
          <button
            type="button"
            onClick={() => setStill(false)}
            className="cursor-pointer rounded-full bg-fg px-4 py-2.25 font-semibold whitespace-nowrap text-black"
          >
            {t("enable")}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label={t("dismiss")}
            className="cursor-pointer px-1.5 py-1 text-lg text-dim"
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
