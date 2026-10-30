"use client";

import { useTranslations } from "next-intl";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import xp from "@/features/experience/Experience.module.css";
import { useStill } from "@/lib/motion";
import type { HeroDict, MeterCls, mount } from "./scene/engine";
import s from "./Scene.module.css";
import { TurboKey } from "./TurboKey";

type Engine = ReturnType<typeof mount>;
const PHONE = "(max-width: 760px)";
const WIDE = "(min-width: 1024px)";
// stage units (scene/core.ts): the stack spans y 14…775.8 (its top corner to the bottom plate's
// lowest point) and x 6…718. Wide layouts also hold the git log, which overflows the
// stage on the right, so the box they fit is wider than the stage.
const STAGE_W = 724,
  TOP = 10,
  PLATE_BOTTOM = 775.8,
  WIDE_W = 816,
  // the htop bars (ZONES.bars in scene/engine.ts); the turbo key sits right of them, on their
  // centre line: its size (TurboKey.module.css) and the gap
  BARS = { x: 0, y: 716, w: 220, h: 72 },
  KEY = 52,
  KEY_GAP = 16,
  KEY_CLEAR = 16,
  // the bottom plate's lower-left edge (fw, z 0, in core.ts' projection), which the key must clear
  EDGE = { x: 5.55, y: 554.5, slope: 0.5774 };
// the scene's load bars are the Htop's meters
const METER: MeterCls = {
  meter: xp.meter,
  l: xp.l,
  b: xp.b,
  f: xp.f,
  v: xp.v,
};

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
  const [live, setLive] = useState(false);
  const [ended, setEnded] = useState(false);

  // fit the stack (and, wide, its widgets) inside the column, with room left under it
  useLayoutEffect(() => {
    const sc = scene.current!,
      h = host.current!;
    const wide = matchMedia(WIDE);
    const fit = () => {
      const w = sc.clientWidth,
        ht = sc.clientHeight,
        pad = 12,
        foot = 52;
      const boxW = wide.matches ? WIDE_W : STAGE_W,
        stackH = PLATE_BOTTOM - TOP,
        availH = ht - 2 * pad - foot;
      const k = Math.max(
        0.2,
        Math.min((w - (wide.matches ? 0 : 20)) / boxW, availH / stackH),
      );
      const ox = (w - boxW * k) / 2,
        oy = pad + (availH - stackH * k) / 2 - TOP * k;
      h.style.setProperty("--s", k.toFixed(4));
      h.style.setProperty("--ox", ox.toFixed(1) + "px");
      h.style.setProperty("--oy", oy.toFixed(1) + "px");
      // the key keeps KEY_CLEAR off the plate's edge: on small stages it and the bars drop a little
      // (never closer than 24px to the scene's bottom)
      const keyR = BARS.x + BARS.w + (KEY_GAP + KEY) / k,
        keyTop = BARS.y + BARS.h / 2 - KEY / 2 / k,
        edge = EDGE.y + (keyR - EDGE.x) * EDGE.slope,
        dy = Math.max(
          0,
          Math.min(
            edge + KEY_CLEAR / k - keyTop,
            (ht - 24 - oy) / k - BARS.y - BARS.h,
          ),
        );
      sc.style.setProperty("--bars-dy", dy.toFixed(1) + "px");
      sc.style.setProperty(
        "--key-x",
        (ox + (BARS.x + BARS.w) * k + KEY_GAP).toFixed(1) + "px",
      );
      sc.style.setProperty(
        "--key-y",
        (oy + (keyTop + dy) * k).toFixed(1) + "px",
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
        engine.current = mount(
          sc,
          h,
          latest().dict,
          latest().still,
          METER,
          s.roam,
          setEnded,
        );
        shown.current = "engine";
        setLive(true);
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
        {live && !still && (
          <TurboKey
            className={s.key}
            ended={ended}
            onTurboChange={(on) => engine.current?.setTurbo(on)}
            onReplay={() => engine.current?.replay()}
          />
        )}
      </div>
      <div className={s.mobile} role="img" aria-label={dict.aria}>
        {mobile}
      </div>
    </>
  );
}
