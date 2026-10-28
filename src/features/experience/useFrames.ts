import { useEffect, useEffectEvent, type RefObject } from "react";
import { onTheme } from "@/lib/theme";

/** Calls `frame(now)` on every animation frame while `ref` is on screen (at least `threshold` of it). */
export function useFrames(
  ref: RefObject<Element | null>,
  frame: (now: number) => void,
  onVisible?: (visible: boolean) => void,
  threshold = 0,
) {
  const tick = useEffectEvent(frame);
  const toggle = useEffectEvent((v: boolean) => onVisible?.(v));
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const loop = (now: number) => {
      tick(now);
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        const on = e.isIntersecting && e.intersectionRatio >= threshold;
        cancelAnimationFrame(raf);
        toggle(on);
        if (on) raf = requestAnimationFrame(loop);
      },
      { threshold },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [ref, threshold]);
}

/** Runs `paint` now, on resize of `ref`, once web fonts are ready (canvas text needs them) and on a theme change. */
export function useRepaint(ref: RefObject<Element | null>, paint: () => void) {
  const run = useEffectEvent(paint);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => run());
    ro.observe(el);
    document.fonts?.ready.then(() => run());
    const off = onTheme(() => run());
    return () => {
      ro.disconnect();
      off();
    };
  }, [ref]);
}
