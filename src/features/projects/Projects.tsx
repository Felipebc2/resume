"use client";

import { useTranslations } from "next-intl";
import x from "../experience/Experience.module.css";
import { BeforeAfter } from "./BeforeAfter";
import { Board } from "./Board";
import s from "./Projects.module.css";

export function Projects() {
  const t = useTranslations("Projects");
  return (
    <section id="projects" aria-labelledby="projects-title" className={s.pj}>
      <div className={s.inner}>
        <header className={s.head}>
          <h2 id="projects-title" className={x.xt}>
            <span className={x.a}>{t("titleA")}</span>
            <span className={x.b}>{t("titleB")}</span>
            <span className={x.c}>{t("titleC")}</span>
          </h2>
          <p className={x.sub}>{t.rich("sub", { b: (c) => <b>{c}</b> })}</p>
        </header>
        <Board />
        <BeforeAfter />
      </div>
    </section>
  );
}
