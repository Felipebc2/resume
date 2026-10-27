"use client";

import { useEffect, useRef, type ReactNode } from "react";
import s from "./StackList.module.css";

/** Fades categories in as they enter the viewport and closes the frame at the end. */
export function RevealFrame({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = ref.current;
    const cats = frame?.querySelectorAll(`.${s.cat}`);
    if (!frame || !cats?.length) return;
    const reveal = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add(s.in);
          reveal.unobserve(e.target);
        }),
      { rootMargin: "0px 0px -12% 0px" },
    );
    cats.forEach((c) => reveal.observe(c));
    const close = new IntersectionObserver(
      ([e]) => frame.classList.toggle(s.closed, e.isIntersecting),
      { rootMargin: "0px 0px -8% 0px" },
    );
    close.observe(cats[cats.length - 1]);
    return () => {
      reveal.disconnect();
      close.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className={s.frame}>
      <span className={s.sides} aria-hidden="true" />
      {children}
    </div>
  );
}
