"use client";

import { useTranslations } from "next-intl";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import { useStill } from "@/lib/motion";
import type { HeroDict, mount } from "./scene/engine";
import s from "./Scene.module.css";

type Engine = ReturnType<typeof mount>;
const PHONE = "(max-width: 760px)";
// stage 724×800; the bottom plate's lowest point = CY + (fw.w + fw.h)/2 · K/2 + TH (scene/core.ts)
const STAGE_W = 724,
  STAGE_H = 800,
  PLATE_BOTTOM = 775.8;

/** The hero's right half. Desktop loads the animation engine once the scene is on screen and the
    browser is idle; reduced motion gets a pre-rendered still; phones get `mobile` (HTML + CSS). */
export function HeroScene({ mobile }: { mobile: ReactNode }) {
  const t = useTranslations("Hero");
  const dict = t.raw("scene") as HeroDict;
  const still = useStill();
  const scene = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const shown = useRef<"none" | "still" | "engine">("none");
  const latest = useEffectEvent(() => ({ dict, still }));

  // fit the whole stage inside the panel, below which sits the toolbar
  useLayoutEffect(() => {
    const sc = scene.current!,
      h = host.current!;
    const fit = () => {
      const w = sc.clientWidth,
        ht = sc.clientHeight,
        top = 12,
        gap = 20,
        tbH = 40,
        bottom = 10;
      const availW = w - 20,
        availH = ht - top - gap - tbH - bottom;
      const k = Math.max(0.2, Math.min(availW / STAGE_W, availH / STAGE_H));
      const oy = top + (availH - STAGE_H * k) / 2;
      h.style.setProperty("--s", k.toFixed(4));
      h.style.setProperty("--ox", ((w - STAGE_W * k) / 2).toFixed(1) + "px");
      h.style.setProperty("--oy", oy.toFixed(1) + "px");
      h.style.setProperty(
        "--tb-top",
        (oy + PLATE_BOTTOM * k + gap).toFixed(1) + "px",
      );
      h.dataset.fit = "";
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(sc);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (engine.current) {
      engine.current.setStill(still);
      return;
    }
    const sc = scene.current!,
      h = host.current!;
    const phone = matchMedia(PHONE);
    let cancelled = false,
      idle = 0,
      io: IntersectionObserver | null = null;
    const showStill = () =>
      import("./scene/still").then(({ stillHTML }) => {
        if (cancelled || engine.current) return;
        h.innerHTML = stillHTML(latest().dict);
        shown.current = "still";
      });
    const loadEngine = () =>
      import("./scene/engine").then(({ mount }) => {
        if (cancelled) return;
        engine.current = mount(sc, h, latest().dict, latest().still);
        shown.current = "engine";
      });
    const go = () => {
      if (phone.matches || io) return;
      if (still) {
        if (shown.current === "none") showStill();
        return;
      }
      io = new IntersectionObserver(([en]) => {
        if (!en.isIntersecting) return;
        io!.disconnect();
        idle =
          typeof requestIdleCallback === "function"
            ? requestIdleCallback(loadEngine, { timeout: 2000 })
            : window.setTimeout(loadEngine, 200);
      });
      io.observe(sc);
    };
    go();
    phone.addEventListener("change", go);
    return () => {
      cancelled = true;
      phone.removeEventListener("change", go);
      io?.disconnect();
      if (typeof cancelIdleCallback === "function") cancelIdleCallback(idle);
      clearTimeout(idle);
    };
  }, [still]);

  useEffect(
    () => () => {
      engine.current?.destroy();
      engine.current = null;
    },
    [],
  );

  useEffect(() => {
    if (engine.current) engine.current.setLocale(dict);
    else if (shown.current === "still")
      import("./scene/still").then(
        ({ stillHTML }) =>
          host.current &&
          shown.current === "still" &&
          (host.current.innerHTML = stillHTML(dict)),
      );
  }, [dict]);

  return (
    <>
      <div ref={scene} className={s.scene} role="group" aria-label={dict.aria}>
        <div ref={host} className={s.host} />
      </div>
      <div className={s.mobile} role="img" aria-label={dict.aria}>
        {mobile}
      </div>
    </>
  );
}
