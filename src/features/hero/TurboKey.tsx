"use client";

import { useTranslations } from "next-intl";
import {
  useEffect,
  useEffectEvent,
  useState,
  useSyncExternalStore,
} from "react";
import s from "./TurboKey.module.css";

export type TurboState = "idle" | "heating" | "turbo" | "turning" | "replay";
// own timing (docs/prototypes/turbo-key.html): the bolt heats up linearly, then the swap to replay
export const HEAT_MS = 450,
  TURN_MS = 600;
const isKey = (k: string) => k === " " || k === "Enter";

/** the key's state machine, outside React so timers and handlers read it synchronously */
function machine() {
  // the latest props' callbacks, set by the component after each render
  const cb: { turbo: (on: boolean) => void; replay: () => void } = {
    turbo: () => {},
    replay: () => {},
  };
  let state: TurboState = "idle",
    on = false,
    heat = 0,
    turn = 0;
  const subs = new Set<() => void>();
  const set = (v: TurboState) => {
    state = v;
    subs.forEach((f) => f());
  };
  const emit = (v: boolean) => {
    if (v === on) return;
    on = v;
    cb.turbo(v);
  };
  const m = {
    bind(turbo: typeof cb.turbo, replay: typeof cb.replay) {
      cb.turbo = turbo;
      cb.replay = replay;
    },
    get: () => state,
    subscribe: (f: () => void) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    ending: () => state === "turning" || state === "replay",
    press() {
      if (state !== "idle") return;
      set("heating");
      heat = window.setTimeout(() => {
        set("turbo");
        emit(true);
      }, HEAT_MS);
    },
    release() {
      clearTimeout(heat);
      if (state === "heating" || state === "turbo") {
        set("idle");
        emit(false);
      }
    },
    end() {
      m.release();
      clearTimeout(turn);
      set("turning");
      turn = window.setTimeout(
        () => state === "turning" && set("replay"),
        TURN_MS,
      );
    },
    reset() {
      clearTimeout(turn);
      if (m.ending()) set("idle");
    },
    replay() {
      m.reset();
      cb.replay();
    },
    dispose() {
      clearTimeout(heat);
      clearTimeout(turn);
    },
  };
  return m;
}

/** A physical key: hold it for turbo (after HEAT_MS), and once the episode has ended it turns into
    Replay. Mouse, touch and keyboard (Space/Enter) all drive the same press/release. */
export function TurboKey({
  ended,
  onTurboChange,
  onReplay,
  className,
}: {
  ended: boolean;
  onTurboChange: (on: boolean) => void;
  onReplay: () => void;
  className?: string;
}) {
  const t = useTranslations("Hero");
  const [key] = useState(machine);
  useEffect(() => key.bind(onTurboChange, onReplay));
  const state = useSyncExternalStore(key.subscribe, key.get, key.get);
  useEffect(() => (ended ? key.end() : key.reset()), [ended, key]);

  const lost = useEffectEvent(() => key.release());
  useEffect(() => {
    const ac = new AbortController();
    window.addEventListener("blur", () => lost(), { signal: ac.signal });
    document.addEventListener(
      "visibilitychange",
      () => document.hidden && lost(),
      { signal: ac.signal },
    );
    return () => {
      ac.abort();
      key.dispose();
    };
  }, [key]);

  const replaying = state === "turning" || state === "replay";
  return (
    <button
      type="button"
      className={className ? `${s.key} ${className}` : s.key}
      data-state={state}
      aria-label={replaying ? t("scene.turbo.replay") : t("scene.turbo.hold")}
      aria-pressed={state === "turbo"}
      onPointerDown={(e) => {
        // no focus() here: a mouse press shouldn't light the focus ring
        if (e.button !== 0 || key.ending()) return;
        e.preventDefault();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
        key.press();
      }}
      onPointerUp={key.release}
      onPointerCancel={key.release}
      onLostPointerCapture={key.release}
      onBlur={key.release}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (!isKey(e.key)) return;
        e.preventDefault();
        if (e.repeat) return;
        if (key.ending()) key.replay();
        else key.press();
      }}
      onKeyUp={(e) => {
        if (!isKey(e.key)) return;
        e.preventDefault();
        key.release();
      }}
      onClick={() => key.ending() && key.replay()}
    >
      <span className={s.ic} aria-hidden="true">
        <svg className={s.bolt} viewBox="0 0 24 24">
          <path d="M13.2 2 4.5 13.4h6.2L9.6 22l9-12.1h-6.3L13.2 2z" />
        </svg>
        <svg className={s.rep} viewBox="0 0 24 24">
          <path d="M20 12a8 8 0 1 1-8-8c2.24 0 4.38.89 5.99 2.44L20 8.4" />
          <path d="M20 3.6v4.8h-4.8" />
        </svg>
      </span>
      <span className={s.legend} aria-hidden="true">
        {replaying ? t("scene.turbo.again") : t("scene.turbo.legend")}
      </span>
    </button>
  );
}
