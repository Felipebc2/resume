import { useEffect, useEffectEvent, type RefObject } from "react";

/** Calls `frame(now)` on every animation frame while `ref` is on screen. */
export function useFrames(
  ref: RefObject<Element | null>,
  frame: (now: number) => void,
  onVisible?: (visible: boolean) => void,
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
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf);
      toggle(e.isIntersecting);
      if (e.isIntersecting) raf = requestAnimationFrame(loop);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [ref]);
}

/** Runs `paint` now, on resize of `ref` and once web fonts are ready (canvas text needs them). */
export function useRepaint(ref: RefObject<Element | null>, paint: () => void) {
  const run = useEffectEvent(paint);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => run());
    ro.observe(el);
    document.fonts?.ready.then(() => run());
    return () => ro.disconnect();
  }, [ref]);
}
