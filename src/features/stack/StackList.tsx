"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import { invertedIcons, stack } from "@/content/stack";
import s from "./StackList.module.css";

export function StackList() {
  const t = useTranslations("Stack");
  const ref = useRef<HTMLDivElement>(null);

  /* fade categories in as they enter the viewport and close the frame at the end */
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
    <section className={s.stacklist} id="stacklist" aria-label={t("listLabel")}>
      <div ref={ref} className={s.frame}>
        <span className={s.sides} aria-hidden="true" />
        <div className={s.cats}>
          {stack.map((cat, ci) => {
            return (
              <div
                key={cat.key}
                className={s.cat}
                style={{ "--n": cat.tools.length } as CSSProperties}
              >
                <div className={s.head}>
                  <span className={s.n}>{String(ci + 1).padStart(2, "0")}</span>
                  <h3>{t(`categories.${cat.key}`)}</h3>
                </div>
                <ul className={s.tiles}>
                  {cat.tools.map((tool) => (
                    <li key={tool.label} className={s.tile}>
                      <span
                        className={`${s.sq} ${tool.icon && invertedIcons.has(tool.icon) ? s.inv : ""}`}
                      >
                        {tool.icon ? (
                          <Image
                            src={`/icons/${tool.icon}.svg`}
                            alt=""
                            width={26}
                            height={26}
                            unoptimized
                          />
                        ) : (
                          <span className={s.txt} aria-hidden="true">
                            {tool.text}
                          </span>
                        )}
                      </span>
                      <span className={s.label}>{tool.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
