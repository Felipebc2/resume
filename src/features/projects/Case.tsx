"use client";

import { useTranslations } from "next-intl";
import {
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
} from "react";
import { flushSync } from "react-dom";
import { useStill } from "@/lib/motion";
import { Blueprint } from "./Blueprint";
import { Cover } from "./Cover";
import type { Item, Node as Part } from "./useItems";
import s from "./Projects.module.css";

export type CaseHandle = { close: (then?: () => void) => void };

const EASE = "cubic-bezier(.2,.8,.2,1)";
const STEPS = ["problem", "approach", "stack", "outcome"] as const;

/** transform that lays `to` exactly over `from` (transform-origin 0 0) */
const flip = (from: Element, to: Element) => {
  const a = from.getBoundingClientRect(),
    z = to.getBoundingClientRect();
  return `translate(${a.left - z.left}px,${a.top - z.top}px) scale(${a.width / z.width},${a.height / z.height})`;
};

/** Full-screen case study that grows out of its card and shrinks back into it. A modal
    <dialog> gives focus trapping, Esc and an inert page for free; Lenis is told to keep
    out (data-lenis-prevent) and wheel/touch outside the scrolling body is swallowed,
    so the page under the scrim stays put without touching <html> overflow. */
export function Case({
  ref,
  item,
  origin,
  onClosed,
  onStack,
}: {
  ref: Ref<CaseHandle>;
  item: Item;
  origin: HTMLElement;
  onClosed: () => void;
  onStack: (stack: string) => void;
}) {
  const t = useTranslations("Projects");
  const still = useStill();
  const dlg = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const then = useRef<(() => void) | undefined>(undefined);
  const closing = useRef(false);
  const [drawn, setDrawn] = useState(still);
  const [why, setWhy] = useState<Part | null>(null);

  useLayoutEffect(() => {
    const el = dlg.current;
    if (!el) return;
    if (!el.open) el.showModal();
    const hold = (e: Event) => {
      const b = body.current;
      if (!b?.contains(e.target as Node) || b.scrollHeight <= b.clientHeight)
        e.preventDefault();
    };
    el.addEventListener("wheel", hold, { passive: false });
    el.addEventListener("touchmove", hold, { passive: false });
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!still) {
      el.animate(
        [
          { transform: flip(origin, el), borderRadius: "20px" },
          { transform: "none", borderRadius: "24px" },
        ],
        { duration: 540, easing: EASE },
      );
      el.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 350,
        pseudoElement: "::backdrop",
      });
      el.querySelectorAll(`.${s.fade}`).forEach((f, i) =>
        f.animate(
          [
            { opacity: 0, transform: "translateY(12px)" },
            { opacity: 1, transform: "none" },
          ],
          {
            duration: 380,
            delay: 300 + i * 90,
            easing: EASE,
            fill: "backwards",
          },
        ),
      );
      timer = setTimeout(() => setDrawn(true), 420);
    }
    return () => {
      clearTimeout(timer);
      el.removeEventListener("wheel", hold);
      el.removeEventListener("touchmove", hold);
    };
  }, [origin, still]);

  const close = (after?: () => void) => {
    const el = dlg.current;
    if (!el || closing.current) return;
    closing.current = true;
    then.current = after;
    if (still || !origin.isConnected) return el.close();
    el.querySelectorAll(`.${s.fade}`).forEach((f) =>
      f.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 150,
        fill: "forwards",
      }),
    );
    el.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 350,
      fill: "forwards",
      pseudoElement: "::backdrop",
    });
    el.animate(
      [
        { transform: "none" },
        { transform: flip(origin, el), borderRadius: "20px" },
      ],
      { duration: 440, easing: EASE, fill: "forwards" },
    ).onfinish = () => el.close();
  };
  useImperativeHandle(ref, () => ({ close }));

  /* every way out (animated close, a second Esc the browser won't let us cancel) ends here */
  const finish = () => {
    /* commit first: the card is visibility:hidden until the case is gone, and can't take focus */
    flushSync(onClosed);
    if (origin.isConnected) origin.focus({ preventScroll: true });
    then.current?.();
  };

  const tbd = t("tbd");
  return (
    <dialog
      ref={dlg}
      className={s.case}
      aria-label={item.name}
      data-lenis-prevent=""
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClose={finish}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className={`${s.hero} ${item.media ? "" : s.type}`}>
        {item.media ? (
          <Cover item={item} word={false} />
        ) : (
          <span className={s.ghost} aria-hidden="true">
            {item.art}
          </span>
        )}
        <div className={`${s.ttl} ${s.fade}`}>
          <span className={s.k}>
            {item.kind} · {item.year}
          </span>
          <h2>{item.name}</h2>
        </div>
      </div>
      <button
        type="button"
        className={s.x}
        aria-label={t("close")}
        onClick={() => close()}
        autoFocus
      >
        ×
      </button>
      <div ref={body} className={s.body}>
        <div className={`${s.blk} ${s.fade}`}>
          <h3>
            <i>◇</i>
            {t("case.blueprint")}
          </h3>
          <Blueprint item={item} drawn={drawn} onWhy={setWhy} />
          <p className={s.cap} aria-live="polite">
            {why ? (
              <>
                <b>{t("case.why", { label: why.label })}</b>
                <span className={why.why ? undefined : s.ph}>
                  {why.why ?? tbd}
                </span>
              </>
            ) : (
              t("case.hint")
            )}
          </p>
        </div>
        <div className={`${s.blk} ${s.steps} ${s.fade}`}>
          {STEPS.map((k, i) => (
            <section key={k}>
              <h3>
                <i>0{i + 1}</i>
                {t(`case.steps.${k}`)}
              </h3>
              {k === "stack" ? (
                <>
                  <span className={s.tags}>
                    {item.stack.map((x) => (
                      <button
                        key={x}
                        type="button"
                        className={s.chip}
                        onClick={() => onStack(x)}
                      >
                        {x}
                      </button>
                    ))}
                  </span>
                  <span className={s.tip}>{t("case.tip")}</span>
                </>
              ) : (
                <p className={item[k] ? undefined : s.ph}>{item[k] || tbd}</p>
              )}
            </section>
          ))}
        </div>
      </div>
    </dialog>
  );
}
