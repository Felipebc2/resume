import { getTranslations } from "next-intl/server";
import type { CSSProperties } from "react";
import { CURSOR_PATH, DOMAINS, ICONS, LAYER_TITLES } from "@/content/hero";
import s from "./Scene.module.css";

const D = DOMAINS.orders;

/** The phone version of the hero scene: four flat layers, no engine. Server-rendered, so no JS. */
export async function HeroMobile() {
  const t = await getTranslations("Hero"); // the cursor names read the same in every locale
  const cursor = (
    <svg viewBox="0 0 14 19" aria-hidden="true">
      <path d={CURSOR_PATH} />
    </svg>
  );
  const blocks = [
    {
      cls: s.l1,
      title: LAYER_TITLES.fw,
      node: (
        <>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={ICONS.postgres} />
          </svg>
          PostgreSQL
        </>
      ),
    },
    { cls: s.l2, title: LAYER_TITLES.ia, node: D.ctrl },
    {
      cls: s.l3,
      title: LAYER_TITLES.uc,
      node: D.uc[0],
      cursors: (
        <>
          <div className={`${s.mcur} ${s.fb}`}>
            {cursor}
            <span className={s.nm}>{t("scene.fb")}</span>
          </div>
          <div className={`${s.mcur} ${s.ia}`}>
            {cursor}
            <span className={s.tag}>
              <span className={s.nm}>{t("scene.ia")}</span>
              <span className={s.bubble}>
                {(t.raw("scene.say.thumbs") as string[])[0]}
              </span>
            </span>
          </div>
        </>
      ),
    },
    { cls: s.l4, title: LAYER_TITLES.en, node: D.ent[0] },
  ];
  return blocks.map((b, i) => (
    <div
      key={b.title}
      className={`${s.mb} ${b.cls}`}
      style={{ animationDelay: `${i * 0.3}s` } as CSSProperties}
    >
      {b.cursors}
      <h3>{b.title}</h3>
      <div className={s.ns}>
        <span className={s.n}>{b.node}</span>
      </div>
    </div>
  ));
}
