/* Hero scene: the DOM half. Builds the stage, renders frame t, runs the episode lifecycle and the
   speed/parallax interaction. Ported from docs/prototypes/hero-motion-v4.4.html; the easter eggs
   live in ./eggs (own chunk, loaded on the first pointer over the scene). */
import { animate, clamp, cubicBezier, mix } from "motion";
import { CURSOR_PATH, GIT, ICONS, LAYER_SHORT } from "@/content/hero";
import type en from "@/i18n/messages/en.json";
import { ease as easeToken, ms } from "@/lib/motion";
import {
  buildEpisode,
  gitLog,
  EASE_DRAG,
  EASE_IO,
  EASE_OUT,
  faceMatrix,
  GAP,
  K,
  LAYER_ORDER,
  LAYERS,
  lerp,
  LI,
  lxyOf,
  NH,
  nextSeed,
  overshootEase,
  P,
  PLATES,
  prog,
  projUV,
  qbez,
  resetView,
  roundedPath,
  SPR_BACK,
  SPR_CHIP,
  SPR_DROP,
  SPR_POP,
  SPR_SNAP,
  STAGE_H,
  STAGE_W,
  TH,
  toLocal,
  uvOf,
  VIEW,
  type Actor,
  type Commit,
  type Episode,
  type Layer,
  type LogRow,
  type Pt3,
  type SNode,
  type XY,
} from "./core";

export type HeroDict = typeof en.Hero.scene;
/** the Htop meter classes (features/experience), reused by the scene's bars */
export interface MeterCls {
  meter: string;
  l: string;
  b: string;
  f: string;
  v: string;
}
type Controls = ReturnType<typeof animate>;
export interface EggState {
  drag: { n: SNode; dx: number; dy: number; at: Pt3 } | null;
  hold: Record<string, Pt3>;
  queue: SNode[];
  back: {
    n: SNode;
    from: Pt3;
    to: Pt3;
    p: number;
    settle: number | null;
  } | null;
  settle: { n: SNode; p: number } | null;
  fb: { x: number; y: number; w: number } | null;
  say: { key: string; t0: number; t1: number } | null;
  hover: SNode | null;
  busy: boolean;
  fixing: boolean;
  messed: number;
  banned: boolean;
  saidAngry: boolean;
  you: XY;
  grab: XY | null;
  banTimer: number | null;
}
/** what ./eggs needs from the running engine */
export interface EggCtx {
  egg: EggState;
  ep: () => Episode;
  scene: HTMLElement;
  signal: AbortSignal;
  ui: { fbPos: () => XY | undefined; youEl: HTMLElement };
  isStatic: () => boolean;
  phase: () => string;
  toStage: (e: PointerEvent) => XY;
  eggSay: (key: string, dur: number) => void;
  setAttr: (e: Element, k: string, v: string | number) => void;
  anim: (from: number, to: number, o: Parameters<typeof animate>[2]) => void;
  later: (fn: () => void, ms: number) => number;
  hasMaster: () => boolean;
  startTicker: () => void;
  settle: () => void;
  liftBan: () => void;
}
export interface EggApi {
  move: (p: XY) => void;
  leave: () => void;
}

/** marks the engine chunk (the e2e looks for it to prove the chunk was or wasn't downloaded) */
export const ENGINE_ID = "fbc2-hero-engine";
const LS_KEY = "fbc2-hero-last";
const svgNS = "http://www.w3.org/2000/svg";
const DOT_R = [1.15, 1.6, 2.1, 2.7]; // halftone dot radius per plate, outermost first
/** the arrowhead marker for an arrow's state */
const mark = (bad: boolean, hot: boolean) =>
  `url(#mk-head${bad ? "-bad" : hot ? "-hot" : ""})`;
// widget boxes in stage units (wide layouts): the git log in the free corner above the right of the
// stack (it overflows the stage), the bars under its lower left, the deployed chip above its left
const ZONES = {
  glog: { x: 610, y: 30, w: 206, h: 180 },
  bars: { x: 0, y: 716, w: 220, h: 72 },
  chip: { x: 16, y: 66, w: 136, h: 30 },
  term: { x: 474, y: 722, w: 210, h: 58 }, // mode B's log, left of where Felipebc2 runs the tests
};
type Zone = (typeof ZONES)["glog"];
const LOG_ROW = 26,
  LOG_MAX = 6,
  BAR = 12;
const BAR_WORK = [0.3, 0.22, 0.18, 0.1], // per layer, fw first: resting load while the episode plays
  BAR_IDLE = [0.44, 0.31, 0.27, 0.12]; // and after deployed

const TEMPLATE = `<div class="stage" aria-hidden="true"><svg class="canvas" viewBox="0 0 724 800"><defs>
<marker id="mk-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9 Z"/></marker>
<marker id="mk-head-bad" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9 Z"/></marker>
<marker id="mk-head-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9 Z"/></marker>
</defs><g data-el="stack"></g><g data-el="sels"></g><g class="pin" data-el="pin" opacity="0"><circle r="8"/><text y="3" text-anchor="middle">F</text></g><g data-el="fx" class="fx"></g><text data-el="measure" style="font:500 18px var(--font-mono);opacity:0;pointer-events:none"></text></svg>
<div class="overlay" data-el="overlay"><div class="glog" data-el="glog"><div class="gp"><span>$</span> </div><div class="rows" data-el="rows"><i class="rail"></i></div></div><div class="bars" data-el="bars"></div><div class="term" data-el="term"><div class="hd"><i></i><i></i><i></i>&nbsp;terminal</div><div class="ls"></div></div><div class="chip ok" data-el="chipOk"><span class="ring"></span><span class="txt"></span><span class="bar"><i></i></span></div></div></div>
<div class="stage cursors" data-el="cursors" aria-hidden="true"></div>`;

export function mount(
  scene: HTMLElement,
  host: HTMLElement,
  dict: HeroDict,
  still: boolean,
  meter: MeterCls,
  roamCls: string, // the hero-wide layer of the visitor's cursor (Scene.module.css .roam)
  onEnded: (ended: boolean) => void, // the episode ended (the turbo key turns into Replay) or restarted
) {
  let L = dict;
  let staticMode = still;
  const ac = new AbortController();
  const signal = ac.signal;
  const on = <T extends EventTarget>(
    t: T,
    type: string,
    fn: (e: never) => void,
  ) => t.addEventListener(type, fn as EventListener, { signal });
  const anims = new Set<Controls>();
  const timers = new Set<number>();
  const anim = (from: number, to: number, o: Parameters<typeof animate>[2]) => {
    const c = animate(from, to, o);
    anims.add(c);
    c.finished.then(
      () => anims.delete(c),
      () => anims.delete(c),
    );
    return c;
  };
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  };
  const fmt = (s: string, o: Record<string, string | number>) =>
    s.replace(/\{(\w+)\}/g, (_, k) => String(o[k] ?? ""));

  host.innerHTML = TEMPLATE;
  host.dataset.engine = ENGINE_ID;
  const $ = <E extends Element = HTMLElement>(k: string) =>
    host.querySelector(`[data-el="${k}"]`) as E;
  const stage = host.querySelector(".stage") as HTMLElement,
    overlay = $("overlay"),
    // the cursors get their own copy of the stage transform, above the turbo key (Scene.module.css)
    cursorsEl = $("cursors"),
    canvas = host.querySelector("svg.canvas") as SVGSVGElement;
  const gStack = $<SVGGElement>("stack"),
    gFx = $<SVGGElement>("fx"),
    gSels = $<SVGGElement>("sels");
  const chipOk = $("chipOk"),
    chipOkTxt = chipOk.querySelector(".txt") as HTMLElement,
    chipOkBar = chipOk.querySelector(".bar i") as HTMLElement;
  const glogEl = $("glog"),
    rowsEl = $("rows"),
    railEl = rowsEl.querySelector(".rail") as HTMLElement,
    barsEl = $("bars");
  (glogEl.firstElementChild as HTMLElement).append(GIT.prompt);
  const place = (e: HTMLElement, z: Zone, h = true) => {
    e.style.left = z.x + "px";
    e.style.top = z.y + "px";
    e.style.width = z.w + "px";
    if (h) e.style.height = z.h + "px";
  };
  place(glogEl, ZONES.glog);
  place(barsEl, ZONES.bars);
  // HeroScene drops the bars a little on small stages (--bars-dy, stage units) so the turbo key
  // beside them clears the plate; the bubbles read where they really are
  barsEl.style.top = `calc(${ZONES.bars.y}px + var(--bars-dy, 0px))`;
  const barsZone: Zone = { ...ZONES.bars };
  const ro = new ResizeObserver(() => (barsZone.y = barsEl.offsetTop));
  ro.observe(scene);
  signal.addEventListener("abort", () => ro.disconnect());
  const wide = matchMedia("(min-width: 1024px)");
  // motion tokens, in episode seconds: the new commit pops in, the rest slide down a row
  const bez = (v: string, d: [number, number, number, number]) => {
    const n = (v.match(/-?[\d.]+/g) || []).map(Number);
    return cubicBezier(...((n.length === 4 ? n : d) as typeof d));
  };
  const POP = bez(easeToken("--ease-pop"), [0.2, 0.9, 0.3, 1.4]),
    SLIDE = bez(easeToken("--ease-out"), [0.2, 0.8, 0.2, 1]);
  const dIn = ms("--d-3") / 1000 || 0.4,
    dOut = ms("--d-2") / 1000 || 0.25;
  const BARS = LAYERS.map((l) => {
    const r = document.createElement("div");
    r.className = meter.meter;
    r.innerHTML = `<span class="${meter.l}">${LAYER_SHORT[l].padEnd(9)}</span><span class="${meter.b}">[</span><span class="${meter.f}"><span></span><span class="${meter.v}"></span></span><span class="${meter.b}">]</span>`;
    barsEl.appendChild(r);
    const f = r.children[2];
    return {
      r,
      bar: f.firstElementChild as HTMLElement,
      val: f.lastElementChild as HTMLElement,
    };
  });
  const termEl = $("term"),
    termLs = termEl.querySelector(".ls") as HTMLElement,
    pinEl = $<SVGGElement>("pin"),
    measureEl = $<SVGTextElement>("measure");
  place(termEl, ZONES.term, false);

  /* =====================================================================
     DOM helpers & pools
     ===================================================================== */
  function el<K extends keyof SVGElementTagNameMap>(
    tag: K,
    attrs: Record<string, string | number> = {},
    parent?: Element,
  ) {
    const e = document.createElementNS(svgNS, tag);
    for (const k in attrs) e.setAttribute(k, String(attrs[k]));
    if (parent) parent.appendChild(e);
    return e;
  }
  const cache = new Map<Element, Record<string, unknown>>();
  const slot = (e: Element) => {
    let m = cache.get(e);
    if (!m) cache.set(e, (m = {}));
    return m;
  };
  const setAttr = (e: Element, k: string, v: string | number) => {
    const m = slot(e);
    if (m[k] !== v) {
      m[k] = v;
      e.setAttribute(k, String(v));
    }
  };
  const setStyle = (e: Element, k: string, v: string | number) => {
    const m = slot(e),
      kk = "$" + k;
    if (m[kk] !== v) {
      m[kk] = v;
      ((e as HTMLElement).style as unknown as Record<string, string>)[k] =
        String(v);
    }
  };
  const setText = (e: Element, v: string) => {
    const m = slot(e);
    if (m.text !== v) {
      m.text = v;
      e.textContent = v;
    }
  };
  const setCls = (e: Element, c: string, onC: boolean) => {
    const m = slot(e),
      kk = "." + c;
    if (m[kk] !== onC) {
      m[kk] = onC;
      e.classList.toggle(c, onC);
    }
  };

  // measurement
  const measureCache = new Map<string, number>();
  function textW(s: string) {
    if (!measureCache.has(s)) {
      measureEl.textContent = s;
      let w = 0;
      try {
        w = measureEl.getComputedTextLength();
      } catch {}
      if (!w) w = s.length * 10.8;
      measureCache.set(s, w);
    }
    return measureCache.get(s)!;
  }

  // selection boxes pool (2), chips pool (5), toasts pool (3)
  const SELS = Array.from({ length: 2 }, () => {
    const g = el("g", { class: "sel", style: "display:none" }, gSels);
    const box = el("polygon", { class: "box" }, g);
    const hs = Array.from({ length: 4 }, () =>
      el("rect", { class: "h", width: 6, height: 6 }, g),
    );
    return { g, box, hs };
  });
  const div = (cls: string) => {
    const d = document.createElement("div");
    d.className = cls;
    overlay.appendChild(d);
    return d;
  };
  const CHIPS = Array.from({ length: 5 }, () => div("chip warn"));
  const TOASTS = Array.from({ length: 3 }, () => div("toast"));

  // cursors
  function makeCursor(cls: "ia" | "fb", name: string) {
    const d = document.createElement("div");
    d.className = "cursor " + cls;
    d.innerHTML = `<svg viewBox="0 0 14 19"><path class="arrowhead" d="${CURSOR_PATH}"/></svg><div class="tag"><span class="name"></span><span class="bubble"></span></div>`;
    cursorsEl.appendChild(d);
    const col = `var(--hero-${cls === "ia" ? "ia" : "action"})`;
    const ghosts: HTMLDivElement[] = [];
    for (let i = 0; i < 6; i++) {
      const g = document.createElement("div");
      g.className = "ghost";
      g.style.setProperty("--c", col);
      g.innerHTML = `<svg viewBox="0 0 14 19"><path d="${CURSOR_PATH}"/></svg>`;
      cursorsEl.insertBefore(g, d);
      ghosts.push(g);
    }
    const nameEl = d.querySelector(".name") as HTMLElement;
    nameEl.textContent = name;
    return {
      el: d,
      svg: d.querySelector("svg") as SVGSVGElement,
      name: nameEl,
      bubble: d.querySelector(".bubble") as HTMLElement,
      ghosts,
      smear: el(
        "line",
        {
          "stroke-linecap": "round",
          "stroke-width": 3,
          opacity: 0,
          stroke: col,
        },
        gFx,
      ),
      speed: Array.from({ length: 3 }, () =>
        el(
          "line",
          {
            "stroke-linecap": "round",
            "stroke-width": 1.2,
            opacity: 0,
            stroke: col,
          },
          gFx,
        ),
      ),
      ripple: el(
        "circle",
        { fill: "none", "stroke-width": 1.5, opacity: 0, stroke: col },
        gFx,
      ),
      pos: undefined as XY | undefined,
    };
  }
  const UI = { ia: makeCursor("ia", L.ia), fb: makeCursor("fb", L.fb) };
  // the visitor's cursor roams the whole hero, so it lives on the section, above the seal
  const zone = scene.closest("section")!,
    youLayer = zone.appendChild(document.createElement("div")),
    youEl = youLayer.appendChild(document.createElement("div"));
  youLayer.className = roamCls;
  youLayer.setAttribute("aria-hidden", "true");
  youEl.className = "cursor you";
  youEl.innerHTML = `<svg viewBox="0 0 14 19"><path class="arrowhead" d="${CURSOR_PATH}"/></svg><div class="tag"><span class="name"></span></div>`;
  // stage units → the layer's pixels, at the stage's scale
  const placeYou = (p: XY) => {
    const r = stage.getBoundingClientRect(),
      z = youLayer.getBoundingClientRect(),
      s = r.width / STAGE_W;
    youEl.style.transform = `translate(${(r.left - z.left + p.x * s).toFixed(1)}px, ${(r.top - z.top + p.y * s).toFixed(1)}px) scale(${s.toFixed(4)})`;
  };

  /* =====================================================================
     DOM per episode — 4 plates (painter's order, bottom → top), risers in the gaps
     ===================================================================== */
  let ep!: Episode;
  const lsGet = () => {
    try {
      return localStorage.getItem(LS_KEY) || "";
    } catch {
      return "";
    }
  };
  const lsSet = (v: string) => {
    try {
      localStorage.setItem(LS_KEY, v);
    } catch {}
  };
  let LOG: { r: LogRow; el: HTMLElement; msg: HTMLElement }[] = [];
  let WORK: { l: Layer; t0: number; t1: number }[] = [];
  interface PlateDom {
    g: SVGGElement;
    sideL: SVGPolygonElement;
    sideR: SVGPolygonElement;
    face: SVGPolygonElement;
    solid: SVGPolygonElement;
    dots: SVGRectElement;
    content: SVGGElement;
    title: SVGTextElement;
    guides: { v: SVGLineElement; h: SVGLineElement };
    marquee: SVGRectElement;
    shadows: SVGGElement;
    arrows: SVGGElement;
    nodes: SVGGElement;
    heads: SVGGElement;
  }
  const PL = {} as Record<Layer, PlateDom>;
  const GAPG: SVGGElement[] = []; // riser groups per gap (0..2)
  function squiggle(x: number, y: number, w: number) {
    let d = `M${x} ${y}`;
    for (let i = 0; i < w; i += 6) d += " q1.5 -2.4 3 0 t3 0";
    return d;
  }
  // halftone top faces: one dot pattern and one radial mask per plate, in plate-local units (the
  // content group's matrix lays them out isometric). Built once per mount, never per frame.
  const defs = canvas.querySelector("defs")!;
  const fade = el("radialGradient", { id: "hf" }, defs);
  for (const [o, a] of [
    [0, 1],
    [0.75, 0.55],
    [1, 0.12],
  ])
    el("stop", { offset: o, "stop-color": "#fff", "stop-opacity": a }, fade);
  LAYERS.forEach((layer, i) => {
    const Pl = PLATES[layer];
    const pat = el(
      "pattern",
      { id: "hd" + i, width: 10, height: 10, patternUnits: "userSpaceOnUse" },
      defs,
    );
    el("circle", { class: "dot", cx: 5, cy: 5, r: DOT_R[i] }, pat);
    const mask = el(
      "mask",
      { id: "hm" + i, maskContentUnits: "userSpaceOnUse" },
      defs,
    );
    el("rect", { width: Pl.w, height: Pl.h, fill: "url(#hf)" }, mask);
  });
  LAYERS.forEach((layer, i) => {
    const Pl = PLATES[layer];
    const g = el(
      "g",
      { class: "plate " + Pl.cls, "data-layer": layer },
      gStack,
    );
    const sideL = el("polygon", { class: "side sideL" }, g),
      sideR = el("polygon", { class: "side sideR" }, g),
      face = el("polygon", { class: "face" }, g),
      solid = el("polygon", { class: "solid" }, g); // the v4.4 fill, shown as the stack closes
    const content = el("g", { class: "content" }, g);
    const dots = el(
      "rect",
      {
        class: "dots",
        width: Pl.w,
        height: Pl.h,
        fill: `url(#hd${i})`,
        mask: `url(#hm${i})`,
      },
      content,
    );
    // ends at the front corner, the mirror of v4.4's title that started there
    const title = el(
      "text",
      { class: "ptitle", x: Pl.w - 22, y: Pl.h - 18, "text-anchor": "end" },
      content,
    );
    title.textContent = Pl.title;
    const guides = {
      v: el("line", { class: "guide", opacity: 0 }, content),
      h: el("line", { class: "guide", opacity: 0 }, content),
    };
    const marquee = el("rect", { class: "marquee", opacity: 0 }, content);
    const shadows = el("g", { class: "shadows" }, content),
      arrows = el("g", { class: "arrows" }, content),
      nodes = el("g", { class: "nodes" }, content);
    const heads = el("g", { class: "heads" }, g);
    PL[layer] = {
      g,
      sideL,
      sideR,
      face,
      solid,
      dots,
      content,
      title,
      guides,
      marquee,
      shadows,
      arrows,
      nodes,
      heads,
    };
    if (i < 3) GAPG[i] = el("g", { class: "gap", "data-gap": i }, gStack);
  });
  function buildDOM(e: Episode) {
    LAYERS.forEach((l) => {
      PL[l].shadows.replaceChildren();
      PL[l].arrows.replaceChildren();
      PL[l].nodes.replaceChildren();
      PL[l].heads.replaceChildren();
    });
    GAPG.forEach((g) => g.replaceChildren());
    termLs.replaceChildren();
    rowsEl.querySelectorAll(".c").forEach((c) => c.remove());
    // oldest first, the wip row last: a row is pushed down by every row after it
    LOG = gitLog(e)
      .map((r, i) => ({ r, i }))
      .sort((a, b) =>
        a.r.kind === "wip" || b.r.kind === "wip"
          ? +(a.r.kind === "wip") - +(b.r.kind === "wip")
          : a.r.t0 - b.r.t0 || a.i - b.i,
      )
      .map(({ r }) => {
        const d = document.createElement("div");
        d.className = "c " + r.kind;
        d.innerHTML = "<i></i><b></b><span></span>";
        d.dataset.k = r.key;
        if (r.vars)
          d.dataset.v = [r.vars.a, r.vars.b, r.vars.l, r.vars.n].join("|");
        rowsEl.appendChild(d);
        return { r, el: d, msg: d.lastElementChild as HTMLElement };
      });
    WORK = (["ia", "fb"] as const).flatMap((k) =>
      e.actors[k].moves.flatMap((m) => {
        const l = "layer" in m.to ? m.to.layer : m.follow?.layer;
        return l ? [{ l, t0: m.t0, t1: m.t1 }] : [];
      }),
    );
    for (const a of e.arrows) {
      if (a.riser) {
        a.segs = GAPG.map((g) => el("line", { class: "riser", opacity: 0 }, g));
        a.port = el("circle", { class: "port", r: 3.5, opacity: 0 }, GAPG[0]);
        a.head = el(
          "polygon",
          { class: "rhead", opacity: 0 },
          PL[a.topLayer].heads,
        );
        a.land = el(
          "circle",
          { class: "port", r: 3.5, opacity: 0 },
          PL[a.topLayer].heads,
        ); // where the riser meets the plate
        a.face = el(
          "path",
          { class: "arrow rface", opacity: 0, "marker-end": "none" },
          PL[a.topLayer].arrows,
        ); // on the plate: from the landing point to the target node
        a.pulse = el("circle", { class: "pulse", r: 4, opacity: 0 }, gFx);
      } else {
        const hostG = PL[a.layer].arrows;
        a.path = el(
          "path",
          { class: "arrow", d: a.d, "marker-end": "url(#mk-head)" },
          hostG,
        );
        a.len = a.path.getTotalLength();
        a.path.setAttribute("stroke-dasharray", String(a.len));
        a.port0 = el(
          "circle",
          { class: "port", r: 3, opacity: 0, cx: a.pts[0].x, cy: a.pts[0].y },
          hostG,
        );
        a.port1 = el(
          "circle",
          {
            class: "port",
            r: 3,
            opacity: 0,
            cx: a.pts[a.pts.length - 1].x,
            cy: a.pts[a.pts.length - 1].y,
          },
          hostG,
        );
      }
    }
    for (const n of e.nodes) {
      const hostP = PL[n.sLayer];
      n.shadow = el(
        "ellipse",
        { class: "shadow", rx: n.w / 2 + 6, ry: NH / 2 + 4, opacity: 0 },
        hostP.shadows,
      ); // only shown while a node is lifted (drag / carry)
      const g = el("g", { class: "node", "data-id": n.id }, hostP.nodes);
      n.g = g;
      n.host = n.sLayer;
      n.inner = el("g", {}, g);
      el(
        "rect",
        {
          class: "depth",
          x: -n.w / 2 - 3,
          y: -NH / 2 + 3,
          width: n.w,
          height: NH,
          rx: 10,
        },
        n.inner,
      ); // a thin bottom face: the node has a little thickness
      el(
        "rect",
        {
          class: "box",
          x: -n.w / 2,
          y: -NH / 2,
          width: n.w,
          height: NH,
          rx: 10,
        },
        n.inner,
      );
      const tx = -n.w / 2 + 16 + (n.icon ? 30 : 0);
      if (n.icon)
        el(
          "path",
          {
            class: "ico",
            d: ICONS[n.icon],
            transform: `translate(${-n.w / 2 + 14} -11) scale(0.92)`,
          },
          n.inner,
        );
      n.text = el("text", { x: tx, y: 6 }, n.inner);
      n.textX = tx;
      n.caret = el(
        "rect",
        { class: "caret", x: tx, y: -10, width: 2, height: 20, opacity: 0 },
        n.inner,
      );
      n.squig = el(
        "path",
        {
          class: "squig",
          d: squiggle(tx, 15, Math.max(textW(n.label), textW(n.typed || ""))),
          opacity: 0,
        },
        n.inner,
      );
      n.badge = el(
        "circle",
        { class: "badge", cx: n.w / 2 - 2, cy: -NH / 2 + 2, r: 4, opacity: 0 },
        n.inner,
      );
      n.badgeRing = el(
        "circle",
        {
          class: "badge-ring",
          cx: n.w / 2 - 2,
          cy: -NH / 2 + 2,
          r: 4,
          opacity: 0,
        },
        n.inner,
      );
    }
    if (e.term) {
      e.termLines.sort((a, b) => a.t - b.t);
      e.termLines.forEach((l) => {
        const d = document.createElement("div");
        d.className = "ln";
        d.style.display = "none";
        termLs.appendChild(d);
        l.el = d;
      });
    }
    cache.clear();
  }
  const commitText = (c: Commit) =>
    fmt(L.commit[c.key as keyof HeroDict["commit"]], c.vars || {});

  /* =====================================================================
     Render — pure function of master time t (+ live speed for FX, + egg overrides, + parallax state)
     ===================================================================== */
  const S = { speed: 1 };
  const egg: EggState = {
    drag: null,
    hold: {},
    queue: [],
    back: null,
    settle: null,
    fb: null,
    say: null,
    hover: null,
    busy: false,
    fixing: false,
    messed: 0,
    banned: false,
    saidAngry: false,
    you: { x: 370, y: 400 },
    grab: null,
    banTimer: null,
  };
  const PX = {
    tx: 0,
    ty: 0,
    yaw: 0,
    pitch: 0,
    vy: 0,
    vp: 0,
    last: 0,
    on: false,
  }; // parallax target / spring state
  function parallaxTick() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - (PX.last || now)) / 1000);
    PX.last = now;
    const kS = 90,
      kD = 2 * Math.sqrt(kS); // critically damped spring on the angles
    const ty = PX.on ? (PX.tx * 4 * Math.PI) / 180 : 0,
      tp = PX.on ? PX.ty * 0.02 : 0;
    PX.vy += (kS * (ty - PX.yaw) - kD * PX.vy) * dt;
    PX.yaw += PX.vy * dt;
    PX.vp += (kS * (tp - PX.pitch) - kD * PX.vp) * dt;
    PX.pitch += PX.vp * dt;
    if (Math.abs(PX.yaw) < 1e-4 && Math.abs(PX.vy) < 1e-4) PX.yaw = PX.vy = 0;
    VIEW.yaw = PX.yaw;
    VIEW.pitch = PX.pitch;
  }
  function posAt(a: Actor, t: number, humanK: number): XY {
    const mv = a.moves;
    let m = null;
    for (let i = 0; i < mv.length; i++) {
      if (mv[i].t0 <= t) m = mv[i];
      else break;
    }
    if (!m) return P(a.pos0);
    const p = prog(t, m.t0, m.t1);
    if (m.follow) {
      const n = m.follow;
      return P({
        layer: n.cur.layer,
        lx: n.cur.lx + m.dx!,
        ly: n.cur.ly + m.dy!,
        dz: n.cur.dz,
      });
    }
    if (m.arrow) {
      if (t >= m.t1) return P(m.to);
      const e = m.ease!(p);
      if (m.arrow.riser) {
        const A = P(m.from!),
          B = P(m.to);
        return { x: lerp(A.x, B.x, e), y: lerp(A.y, B.y, e) };
      }
      const pt = m.arrow.path.getPointAtLength(m.arrow.len * e);
      return P({ layer: m.arrow.layer, lx: pt.x, ly: pt.y });
    }
    const A = P(m.from!),
      B = P(m.to);
    if (t >= m.t1) return B;
    let e = m.ease!(p);
    if (humanK > 0)
      e = mix(e, overshootEase(humanK)(p), clamp(0, 1, humanK * 3));
    return qbez(A, P(m.c!), B, e);
  }
  // node state at t: {layer, lx, ly, dz}
  function nodeStateAt(n: SNode, t: number) {
    let st: Pt3 & { dz: number } = {
      layer: n.sLayer,
      lx: n.slx,
      ly: n.sly,
      dz: 0,
    };
    for (const m of n.moves) {
      if (t < m.t0) break;
      if (t >= m.t1) {
        st = { layer: m.to.layer, lx: m.to.lx, ly: m.to.ly, dz: 0 };
        continue;
      }
      const p = m.ease(prog(t, m.t0, m.t1));
      if (m.lift && m.from.layer !== m.to.layer) {
        const A = P(m.from),
          B = P(m.to);
        const sx = lerp(A.x, B.x, p),
          sy = lerp(A.y, B.y, p);
        const layer = p < 0.5 ? m.from.layer : m.to.layer;
        const l = toLocal(layer, sx, sy);
        st = { layer, lx: l.lx, ly: l.ly, dz: m.lift * Math.sin(Math.PI * p) };
      } else
        st = {
          layer: m.to.layer,
          lx: lerp(m.from.lx, m.to.lx, p),
          ly: lerp(m.from.ly, m.to.ly, p),
          dz: m.lift ? m.lift * Math.sin(Math.PI * p) : 0,
        };
    }
    return st;
  }
  function testProgress(t: number) {
    const T = ep.tests;
    if (!T) return null;
    if (T.rerun && t >= T.rerun.t0)
      return {
        n: Math.min(24, Math.round(prog(t, T.rerun.t0, T.rerun.t1) * 24)),
        done: t >= T.rerun.t1,
        fail: false,
        run: true,
      };
    if (t >= T.t0) {
      const n = Math.round(prog(t, T.t0, T.t1) * 24);
      const done = t >= T.t1;
      return {
        n: T.fail && done ? 23 : n,
        done,
        fail: !!(T.fail && done),
        run: true,
      };
    }
    return { n: 0, done: false, fail: false, run: false };
  }
  function bubbleText(key: string, t: number) {
    const short = S.speed >= 1.8 ? 1 : 0;
    let txt = L.say[key as keyof HeroDict["say"]][short];
    if (key === "tests") {
      const tp = testProgress(t);
      txt = txt.replace("{n}", String(tp ? tp.n : 0));
    }
    return txt;
  }
  const WSEG = 2.0;
  function wanderAt(tau: number) {
    const W = ep.wander,
      n = W.length,
      i = Math.floor(tau / WSEG),
      k = (tau - i * WSEG) / WSEG;
    const tgt = (j: number) => {
      const w = W[((j % n) + n) % n],
        nd = w.node;
      return P({
        layer: nd.cur.layer,
        lx: nd.cur.lx + nd.w / 2 - 18,
        ly: nd.cur.ly + 12,
      });
    };
    const from = i === 0 ? { x: 690, y: 690 } : tgt(i - 1),
      to = tgt(i);
    const e = EASE_IO(clamp(0, 1, (k - 0.12) / 0.6));
    return {
      x: lerp(from.x, to.x, e) + Math.sin(tau * 1.7) * 2.5,
      y: lerp(from.y, to.y, e) + Math.cos(tau * 1.1) * 2,
      hover: k > 0.72 ? W[i % n].node : null,
      idx: i,
      k,
    };
  }
  let glowCache = -1;
  const layerZ = (layer: Layer, gk: number) => LI[layer] * GAP * gk;
  const polyPts = (pts: XY[]) =>
    pts.map((p) => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ");
  function plateCorners(layer: Layer) {
    const Pl = PLATES[layer];
    return [
      P({ layer, lx: 0, ly: 0 }),
      P({ layer, lx: Pl.w, ly: 0 }),
      P({ layer, lx: Pl.w, ly: Pl.h }),
      P({ layer, lx: 0, ly: Pl.h }),
    ];
  }

  let warned = false,
    chipShown = false,
    termShown = false;
  type Box = { x0: number; x1: number; y0: number; y1: number };
  const hit = (z: Zone, r: Box) =>
    r.x0 < z.x + z.w && r.x1 > z.x && r.y0 < z.y + z.h && r.y1 > z.y;
  // bubbles never sit on the widgets: they take the free side straight away
  const onWidget = (r: Box) =>
    (wide.matches && (hit(ZONES.glog, r) || hit(barsZone, r))) ||
    (chipShown && hit(ZONES.chip, r)) ||
    (termShown && hit(ZONES.term, r));
  function render(t: number) {
    try {
      renderFrame(t);
    } catch (err) {
      if (!warned) {
        warned = true;
        console.error("render frame failed", err);
      }
    }
  }
  function renderFrame(t: number) {
    parallaxTick();
    const sp = S.speed,
      hot = clamp(0, 1, (sp - 1.15) / 2.2),
      humanK = hot * 0.22;
    const idle = ep.idle && t >= ep.idle.t0,
      tau = idle ? t - ep.idle!.t0 : 0;
    const wd = idle ? wanderAt(tau) : null;
    // collapse progress over d seconds, starting o after the collapse (0 without one)
    const col = (d: number, o = 0) =>
      ep.collapse
        ? EASE_IO(prog(t, ep.collapse.t0 + o, ep.collapse.t0 + o + d))
        : 0;
    const colK = (layer: Layer) => col(0.36, LAYER_ORDER.indexOf(layer) * 0.12),
      colA = col(0.36);

    // ---- stack geometry: gap factor (reopen / breathing / collapse) + per-plate entrance drop
    let gk = 1;
    if (ep.index > 0) gk = clamp(0, 1.08, SPR_DROP(t - 0.25));
    // halftone only while the stack is open: closed (or still landing) the plates are solid
    {
      const tb0 = ep.deployed + 0.65,
        d = t - tb0;
      if (d >= 0 && d < 1.6)
        gk *=
          d < 0.16
            ? 1 - 0.15 * EASE_OUT(d / 0.16)
            : 1 - 0.15 * (1 - SPR_BACK(d - 0.16));
    }
    gk *= 1 - col(0.9);
    for (const layer of LAYERS) {
      VIEW.z[layer] = layerZ(layer, gk);
      const pe = ep.plates[LI[layer]];
      let dy = 0,
        op = 1;
      if (ep.index === 0) {
        if (t < pe.t0) {
          dy = -60 * K;
          op = 0;
        } else {
          const q = t - pe.t0;
          dy = -60 * K * (1 - SPR_DROP(q));
          op = clamp(0, 1, q / 0.12);
        }
      }
      VIEW.dy[layer] = dy;
      const D = PL[layer];
      setStyle(D.g, "opacity", op.toFixed(2));
      let open = clamp(0, 1, gk);
      if (ep.index === 0) open *= EASE_IO(prog(t, pe.t0 + 0.2, pe.t1)); // lands solid, then dots in
      setStyle(D.dots, "opacity", open.toFixed(2));
      setStyle(D.dots, "display", open > 0.005 ? "" : "none");
      setStyle(D.solid, "opacity", (1 - open).toFixed(2));
      setAttr(D.face, "stroke-opacity", open.toFixed(2));
      const c = plateCorners(layer);
      setAttr(D.face, "points", polyPts(c));
      setAttr(D.solid, "points", polyPts(c));
      setAttr(
        D.sideL,
        "points",
        polyPts([
          c[3],
          c[2],
          { x: c[2].x, y: c[2].y + TH },
          { x: c[3].x, y: c[3].y + TH },
        ]),
      );
      setAttr(
        D.sideR,
        "points",
        polyPts([
          c[2],
          c[1],
          { x: c[1].x, y: c[1].y + TH },
          { x: c[2].x, y: c[2].y + TH },
        ]),
      );
      const m = faceMatrix(layer);
      setAttr(
        D.content,
        "transform",
        `matrix(${m.a.toFixed(4)} ${m.b.toFixed(4)} ${m.c.toFixed(4)} ${m.d.toFixed(4)} ${m.e.toFixed(2)} ${m.f.toFixed(2)})`,
      );
      let tl =
        ep.index === 0
          ? clamp(0, 1, (t - pe.t1) / 0.3)
          : clamp(0, 1, (t - 0.5) / 0.3);
      tl *= 1 - col(0.3); // layer titles fade with the collapse
      setStyle(D.title, "opacity", tl.toFixed(2));
    }
    // glow (one pulse after deploy)
    {
      const d = t - ep.deployed;
      const g =
        d < 0 ? 0 : d < 0.22 ? d / 0.22 : clamp(0, 1, 1 - (d - 0.22) / 0.45);
      const gv = Math.round(g * 100) / 100;
      if (gv !== glowCache) {
        glowCache = gv;
        canvas.style.setProperty("--glow", String(gv));
      }
    }

    // nudges (idle) + egg overrides
    const nudge: Record<string, XY> = {};
    if (wd) {
      const W = ep.wander;
      for (
        let j = 0;
        j < Math.min(W.length, wd.idx + (wd.k > 0.8 ? 1 : 0));
        j++
      )
        if (W[j].nudge) {
          const o = nudge[W[j].node.id] || { x: 0, y: 0 };
          o.x += W[j].nudge!.x;
          o.y += W[j].nudge!.y;
          nudge[W[j].node.id] = o;
        }
    }
    const hovered = egg.hover || (wd && wd.hover) || null;
    for (const n of ep.nodes) {
      let s = 0,
        o = 0,
        vis = false;
      for (const sp2 of n.spans) {
        if (t < sp2[0]) break;
        if (t < sp2[1]) {
          const d = t - sp2[0];
          s = 0.62 + 0.38 * SPR_POP(d);
          o = clamp(0, 1, d / 0.12);
          vis = true;
        } else {
          const dd = t - sp2[1];
          if (dd < 0.22) {
            const k = EASE_IO(dd / 0.22);
            s = 1 - 0.5 * k;
            o = 1 - k;
            vis = true;
          } else vis = false;
        }
      }
      if (!vis) {
        setStyle(n.inner, "opacity", 0);
        setStyle(n.g, "display", "none");
        setStyle(n.shadow, "display", "none");
        n.cx = null;
        continue;
      }
      setStyle(n.g, "display", "");
      setStyle(n.shadow, "display", "");
      let st = nodeStateAt(n, t);
      const lastMove = n.moves.length ? n.moves[n.moves.length - 1] : null;
      if (lastMove && t >= lastMove.t1 && t < lastMove.t1 + 0.8) {
        const k = SPR_DROP(t - lastMove.t1);
        s *= 1 + 0.035 * (1 - k);
        if (lastMove.lift) st.dz = 14 * (1 - k);
      }
      if (nudge[n.id]) {
        st.lx += nudge[n.id].x;
        st.ly += nudge[n.id].y;
      }
      if (egg.drag && egg.drag.n === n) st = { ...egg.drag.at, dz: 24 };
      else if (egg.hold[n.id]) st = { ...egg.hold[n.id], dz: 0 };
      else if (egg.back && egg.back.n === n) {
        const b = egg.back,
          A = P(b.from),
          B = P(b.to),
          sx = lerp(A.x, B.x, b.p),
          sy = lerp(A.y, B.y, b.p),
          layer = b.p < 0.5 ? b.from.layer : b.to.layer,
          l = toLocal(layer, sx, sy);
        st = {
          layer,
          lx: l.lx,
          ly: l.ly,
          dz:
            60 * Math.sin(Math.PI * b.p) +
            (b.settle != null ? 14 * (1 - b.settle) : 0),
        };
      } else if (egg.settle && egg.settle.n === n)
        st.dz = 24 * (1 - egg.settle.p);
      n.cur = st;
      if (n.host !== st.layer) {
        PL[st.layer].nodes.appendChild(n.g);
        PL[st.layer].shadows.appendChild(n.shadow);
        n.host = st.layer;
      }
      const ck = colK(st.layer);
      if (ck > 0) {
        s *= 1 - ck;
        o *= 1 - ck;
      }
      const scr = P(st);
      n.cx = scr.x;
      n.cy = scr.y;
      setAttr(
        n.g,
        "transform",
        `translate(${(st.lx + st.dz).toFixed(1)} ${(st.ly - st.dz).toFixed(1)})`,
      );
      setAttr(n.inner, "transform", `scale(${s.toFixed(3)})`);
      setStyle(n.inner, "opacity", o.toFixed(2));
      const shk = clamp(0.35, 1, 1 - st.dz / 120);
      setAttr(
        n.shadow,
        "transform",
        `translate(${st.lx.toFixed(1)} ${(st.ly + 4).toFixed(1)}) scale(${(s * shk).toFixed(3)})`,
      );
      setStyle(
        n.shadow,
        "opacity",
        (st.dz > 2 ? o * 0.22 * clamp(0, 1, st.dz / 24) : 0).toFixed(2),
      );
      // typing
      let txt = "",
        caret = 0;
      for (const ty of n.types) {
        if (t < ty.t0) break;
        const i = Math.min(
          ty.frames.length - 1,
          Math.floor(prog(t, ty.t0, ty.t1) * ty.frames.length),
        );
        txt = ty.frames[i];
        caret =
          t < ty.t1
            ? 1
            : ty.edit && t < ty.edit
              ? Math.floor((t - ty.t1) / 0.25) % 2 === 0
                ? 1
                : 0
              : t < ty.t1 + 0.9 && Math.floor((t - ty.t1) / 0.3) % 2 === 0
                ? 1
                : 0;
      }
      setText(n.text, txt);
      setAttr(n.caret, "x", (n.textX + textW(txt) + 1).toFixed(1));
      setAttr(n.caret, "opacity", caret);
      let sq = 0,
        bd = 0,
        orphan = false,
        fail = false,
        badgeP = 0;
      for (const f of n.flags) {
        const onF = t >= f.t0 && t < f.t1;
        if (!onF) continue;
        if (f.kind === "squig") sq = 1;
        else if (f.kind === "badge") {
          bd = 1;
          badgeP = (t - f.t0) % 1.4;
        } else if (f.kind === "orphan") orphan = true;
        else if (f.kind === "fail") fail = true;
      }
      setAttr(n.squig, "opacity", sq);
      setAttr(n.badge, "opacity", bd);
      setAttr(
        n.badgeRing,
        "opacity",
        bd ? (0.7 * (1 - badgeP / 1.4)).toFixed(2) : 0,
      );
      if (bd) setAttr(n.badgeRing, "r", (4 + badgeP * 10).toFixed(1));
      setCls(n.g, "misplaced", bd === 1 && n.id === "repo");
      setCls(n.g, "orphan", orphan);
      setCls(n.g, "fail", fail);
      setCls(n.g, "hover", hovered === n);
      setCls(n.g, "grab", !!(egg.drag && egg.drag.n === n));
    }

    // ---- arrows: risers (vertical, in the gaps) and same-plate orthogonal arrows
    const pulseP = prog(t, ep.deployed, ep.deployed + 0.6),
      pulseOn = t >= ep.deployed && t < ep.deployed + 0.62;
    for (const a of ep.arrows) {
      const e = a.draw;
      if (a.riser) {
        const src = a.from,
          uv = uvOf(src.cur.layer, src.cur.lx, src.cur.ly + NH / 2 - 6);
        let topL = a.up ? a.to.cur.layer : src.cur.layer,
          botL = a.up ? src.cur.layer : a.to.cur.layer;
        const inverted = LI[topL] < LI[botL];
        if (inverted) {
          const sw = topL;
          topL = botL;
          botL = sw;
        } // a node dragged past the other end: nothing to draw, keep the hosts valid
        const zTop = VIEW.z[topL] + (a.up ? 0 : src.cur.dz || 0),
          zBot = VIEW.z[botL] + (a.up ? src.cur.dz || 0 : 0);
        const Tp = projUV(uv.u, uv.v, zTop, topL),
          Bp = projUV(uv.u, uv.v, zBot, botL);
        const x = Tp.x,
          yTop = Tp.y;
        let yBot = Bp.y;
        if (a.up) {
          // start where the line leaves the source node (its back edge, screen-up), not over its label
          const ex = Math.min(src.w / 2, NH - 6) + 2,
            E = P({
              layer: src.cur.layer,
              lx: src.cur.lx - ex,
              ly: src.cur.ly + NH / 2 - 6 - ex,
              dz: src.cur.dz,
            });
          yBot = Math.max(yTop, Math.min(yBot, E.y));
        }
        let p = !e || t < e.t0 ? 0 : EASE_IO(prog(t, e.t0, e.t1));
        if (a.remove && t >= a.remove.t0)
          p *= 1 - EASE_IO(prog(t, a.remove.t0, a.remove.t1));
        if (colA > 0) p *= 1 - colA;
        const offP = (n: SNode) => {
          const Pl = PLATES[n.cur.layer];
          return (
            n.cur.lx < 0 || n.cur.lx > Pl.w || n.cur.ly < 0 || n.cur.ly > Pl.h
          );
        };
        const offStack = offP(src) || offP(a.to); // either end dragged off its plate: no arrow at all
        const hide = p <= 0 || inverted || topL === botL || offStack;
        const pv = clamp(0, 1, p / 0.72),
          pf = clamp(0, 1, (p - 0.72) / 0.28); // vertical part first, then the run on the plate
        const bad = !!(a.bad && t >= a.bad.t0 && t < a.bad.t1),
          hotA =
            !!e && !bad && t < e.t1 + 0.25 && !(a.remove && t >= a.remove.t0);
        // drawn from the port end: up → from the bottom; down (bad) → from the top. The dep fix (morph) walks the head to the other end.
        const headAt =
          a.morph && t >= a.morph.t0
            ? EASE_IO(prog(t, a.morph.t0, a.morph.t1))
            : a.up
              ? "top"
              : "bottom";
        const len = yBot - yTop,
          visLen = len * pv;
        const y0 = a.up ? yBot - visLen : yTop,
          y1 = a.up ? yBot : yTop + visLen; // visible span [y0, y1]
        a.segs.forEach((sg, k) => {
          const segTop = projUV(
              uv.u,
              uv.v,
              VIEW.z[LAYERS[k + 1]],
              LAYERS[k + 1],
            ).y,
            segBot = projUV(uv.u, uv.v, VIEW.z[LAYERS[k]], LAYERS[k]).y;
          const s0 = Math.max(y0, segTop),
            s1 = Math.min(y1, segBot);
          const onS = !hide && s1 > s0 + 0.5 && k >= LI[botL] && k < LI[topL];
          setAttr(sg, "opacity", onS ? 1 : 0);
          if (onS) {
            setAttr(sg, "x1", x.toFixed(1));
            setAttr(sg, "x2", x.toFixed(1));
            setAttr(sg, "y1", s0.toFixed(1));
            setAttr(sg, "y2", s1.toFixed(1));
          }
          setCls(sg, "bad", bad);
          setCls(sg, "hot", hotA);
        });
        // port dot at the start end, head at the far end
        const portY = a.up ? yBot : yTop;
        const portG = GAPG[clamp(0, 2, a.up ? LI[botL] : LI[topL] - 1)];
        if (a.port.parentNode !== portG) portG.appendChild(a.port);
        setAttr(a.port, "cx", x.toFixed(1));
        setAttr(a.port, "cy", portY.toFixed(1));
        setAttr(a.port, "opacity", hide ? 0 : 1);
        setCls(a.port, "bad", bad);
        const atTop =
          typeof headAt === "number" ? headAt < 0.5 === a.up : headAt === "top";
        const hy =
            typeof headAt === "number"
              ? lerp(a.up ? yTop : yBot, a.up ? yBot : yTop, headAt)
              : atTop
                ? yTop
                : yBot,
          dir = atTop ? -1 : 1,
          headL = atTop ? topL : botL;
        const headHost = PL[headL].heads;
        if (a.head.parentNode !== headHost) {
          headHost.appendChild(a.head);
          headHost.appendChild(a.land);
          PL[headL].arrows.appendChild(a.face);
        }
        // on the landing plate: a short run from the landing point to the target node's nearest edge (the arrowhead points at the node)
        const tgt = a.to,
          Pt = PLATES[headL];
        let faceOn = false;
        if (
          typeof headAt !== "number" &&
          !hide &&
          tgt.cur.layer === headL &&
          tgt.cur.lx >= 0 &&
          tgt.cur.lx <= Pt.w &&
          tgt.cur.ly >= 0 &&
          tgt.cur.ly <= Pt.h
        ) {
          const L0 = lxyOf(headL, uv.u, uv.v),
            tx = tgt.cur.lx + (tgt.cur.dz || 0),
            ty = tgt.cur.ly - (tgt.cur.dz || 0);
          let port, via;
          if (Math.abs(L0.ly - ty) <= NH / 2 + 4) {
            port = {
              x: tx + (L0.lx < tx ? -1 : 1) * (tgt.w / 2 + 2),
              y: L0.ly,
            };
            via = null;
          } else {
            port = { x: tx, y: ty + (L0.ly < ty ? -1 : 1) * (NH / 2 + 2) };
            via = { x: tx, y: L0.ly };
          }
          const pts = [{ x: L0.lx, y: L0.ly }].concat(
            via && Math.abs(via.x - L0.lx) > 2 ? [via] : [],
            [port],
          );
          const dist = Math.hypot(port.x - L0.lx, port.y - L0.ly);
          if (dist > 14) {
            faceOn = true;
            const d = roundedPath(pts, 10);
            setAttr(a.face, "d", d);
            if (a.faceD !== d) {
              a.faceD = d;
              a.faceLen = a.face.getTotalLength();
              setAttr(a.face, "stroke-dasharray", a.faceLen.toFixed(1));
            }
            setAttr(
              a.face,
              "stroke-dashoffset",
              (a.faceLen * (1 - pf)).toFixed(1),
            );
            setAttr(a.face, "marker-end", pf > 0.97 ? mark(bad, hotA) : "none");
          }
        }
        setAttr(a.face, "opacity", faceOn && pv >= 1 ? 1 : 0);
        setCls(a.face, "bad", bad);
        setCls(a.face, "hot", hotA);
        const showLand = !hide && pv >= 0.999 && typeof headAt !== "number";
        setAttr(a.land, "opacity", showLand ? 1 : 0);
        if (showLand) {
          setAttr(a.land, "cx", x.toFixed(1));
          setAttr(a.land, "cy", hy.toFixed(1));
        }
        setCls(a.land, "bad", bad);
        const showHead =
          !hide && !faceOn && (p > 0.985 || typeof headAt === "number");
        setAttr(a.head, "opacity", showHead ? 1 : 0);
        if (showHead)
          setAttr(
            a.head,
            "points",
            `${x.toFixed(1)},${(hy + 1 * dir).toFixed(1)} ${(x - 5).toFixed(1)},${(hy - 9 * dir).toFixed(1)} ${(x + 5).toFixed(1)},${(hy - 9 * dir).toFixed(1)}`,
          );
        setCls(a.head, "bad", bad);
        setCls(a.head, "hot", hotA);
        // light pulse climbing the riser after deploy
        const pon = pulseOn && !hide && a.up;
        setAttr(
          a.pulse,
          "opacity",
          pon ? (0.9 * Math.sin(Math.PI * pulseP)).toFixed(2) : 0,
        );
        if (pon) {
          setAttr(a.pulse, "cx", x.toFixed(1));
          setAttr(a.pulse, "cy", lerp(yBot, yTop, pulseP).toFixed(1));
        }
        continue;
      }
      let p = 0;
      if (e && t >= e.t0)
        p =
          a.remove && t >= a.remove.t0
            ? 1 - EASE_IO(prog(t, a.remove.t0, a.remove.t1))
            : EASE_IO(prog(t, e.t0, e.t1));
      if (!e || p <= 0) {
        setStyle(a.path, "opacity", 0);
        setAttr(a.port0, "opacity", 0);
        setAttr(a.port1, "opacity", 0);
        continue;
      }
      if (colA > 0) p *= 1 - colA;
      setStyle(a.path, "opacity", 1);
      const bad = !!(a.bad && t >= a.bad.t0 && t < a.bad.t1),
        hotA = !bad && t < e.t1 + 0.25 && !(a.remove && t >= a.remove.t0);
      setCls(a.path, "bad", bad);
      setCls(a.path, "hot", hotA);
      setCls(a.port0, "bad", bad);
      setCls(a.port1, "bad", bad);
      setAttr(a.path, "marker-end", p < 0.985 ? "none" : mark(bad, hotA));
      setAttr(a.path, "stroke-dashoffset", (a.len * (1 - p)).toFixed(1));
      setAttr(a.port0, "opacity", p > 0 ? 1 : 0);
      const done = t >= e.t1;
      setAttr(a.port1, "opacity", done && p > 0.99 ? 1 : 0);
      const snap = SPR_SNAP(t - e.t1);
      setAttr(a.port1, "r", (3 + 2.4 * (1 - snap) * (done ? 1 : 0)).toFixed(2));
    }

    // selection handles (projected node quads) + the grabbed You cursor
    if (egg.grab) {
      placeYou(egg.grab);
      youEl.style.opacity = "1";
    }
    {
      let used = 0;
      const quad = (n: SNode, pad: number) => {
        const s = n.cur;
        return [
          [-n.w / 2 - pad, -NH / 2 - pad],
          [n.w / 2 + pad, -NH / 2 - pad],
          [n.w / 2 + pad, NH / 2 + pad],
          [-n.w / 2 - pad, NH / 2 + pad],
        ].map(([dx, dy]) =>
          P({
            layer: s.layer,
            lx: s.lx + (s.dz || 0) + dx,
            ly: s.ly - (s.dz || 0) + dy,
          }),
        );
      };
      const showSel = (S2: (typeof SELS)[number], pts: XY[]) => {
        setStyle(S2.g, "display", "");
        setAttr(S2.box, "points", polyPts(pts));
        pts.forEach((q, i) => {
          setAttr(S2.hs[i], "x", (q.x - 3).toFixed(1));
          setAttr(S2.hs[i], "y", (q.y - 3).toFixed(1));
        });
      };
      if (egg.grab) {
        const x = egg.grab.x - 6,
          y = egg.grab.y - 6;
        showSel(SELS[used++], [
          { x, y },
          { x: x + 26, y },
          { x: x + 26, y: y + 32 },
          { x, y: y + 32 },
        ]);
      }
      for (const s of ep.sels) {
        if (t < s.t0 || t >= s.t1 || used >= SELS.length) continue;
        showSel(SELS[used++], quad(s.node, 5));
      }
      for (let i = used; i < SELS.length; i++)
        setStyle(SELS[i].g, "display", "none");
    }
    // marquee (plate-local) + smart guides (plate-local)
    for (const l of LAYERS) {
      const D = PL[l];
      if (ep.marquee && ep.marquee.layer === l) {
        const m = ep.marquee,
          onM = t >= m.t0 && t < m.t2;
        if (onM) {
          const kk = EASE_DRAG(prog(t, m.t0, m.t1));
          setAttr(D.marquee, "x", m.x0);
          setAttr(D.marquee, "y", m.y0);
          setAttr(D.marquee, "width", ((m.x1 - m.x0) * kk).toFixed(1));
          setAttr(D.marquee, "height", ((m.y1 - m.y0) * kk).toFixed(1));
        }
        setAttr(D.marquee, "opacity", onM ? 1 : 0);
      } else setAttr(D.marquee, "opacity", 0);
      if (ep.guides && ep.guides.layer === l) {
        const g = ep.guides,
          onG = t >= g.t0 && t < g.t1;
        setAttr(D.guides.v, "opacity", onG ? 1 : 0);
        setAttr(D.guides.h, "opacity", onG ? 1 : 0);
        if (onG) {
          setAttr(D.guides.v, "x1", g.vx);
          setAttr(D.guides.v, "x2", g.vx);
          setAttr(D.guides.v, "y1", g.vy0);
          setAttr(D.guides.v, "y2", g.vy1);
          setAttr(D.guides.h, "y1", g.hy);
          setAttr(D.guides.h, "y2", g.hy);
          setAttr(D.guides.h, "x1", g.hx0);
          setAttr(D.guides.h, "x2", g.hx1);
        }
      } else {
        setAttr(D.guides.v, "opacity", 0);
        setAttr(D.guides.h, "opacity", 0);
      }
    }
    // comment pin (screen space, anchored in 3D)
    if (ep.pin) {
      const p = ep.pin,
        onP = t >= p.t0 && t < p.t1;
      if (onP) {
        const q = P(p.pt);
        const d = t - p.t0,
          s = 0.5 + 0.5 * SPR_POP(d);
        setAttr(
          pinEl,
          "transform",
          `translate(${q.x.toFixed(1)} ${q.y.toFixed(1)}) scale(${s.toFixed(3)})`,
        );
        setAttr(
          pinEl,
          "opacity",
          (
            clamp(0, 1, d / 0.12) *
            (t >= p.tRes ? clamp(0, 1, 1 - (t - p.tRes) / 0.9) : 1)
          ).toFixed(2),
        );
        setCls(pinEl, "done", t >= p.tRes);
        setText(pinEl.lastElementChild!, t >= p.tRes ? "✓" : "F");
      } else setAttr(pinEl, "opacity", 0);
    } else setAttr(pinEl, "opacity", 0);

    // chips (errors), anchored in 3D
    ep.chips.forEach((c, i) => {
      const e2 = CHIPS[i];
      if (!e2) return;
      const onC = t >= c.t0 && t < c.t1;
      const d = onC ? t - c.t0 : t - c.t1;
      let s = 0.7,
        o = 0;
      if (onC) {
        s = 0.7 + 0.3 * SPR_CHIP(d);
        o = clamp(0, 1, d / 0.12);
      } else if (t >= c.t1) {
        s = 0.9 * clamp(0, 1, 1 - d / 0.18) + 0.1;
        o = clamp(0, 1, 1 - d / 0.18);
      }
      if (o > 0) {
        const q = P(c.pt);
        const x = clamp(8, STAGE_W - 150, q.x + c.dx),
          y = clamp(8, STAGE_H - 30, q.y + c.dy);
        setText(e2, L.chip[c.key as keyof HeroDict["chip"]]);
        setStyle(
          e2,
          "transform",
          `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${s.toFixed(3)})`,
        );
      }
      setStyle(e2, "opacity", o.toFixed(2));
    });
    for (let i = ep.chips.length; i < CHIPS.length; i++)
      setStyle(CHIPS[i], "opacity", 0);
    // toasts (mode C)
    {
      let stack = 0,
        used = 0;
      for (const ts of ep.toasts) {
        const onT = t >= ts.t0 && t < ts.t1;
        if (!onT || used >= TOASTS.length) continue;
        const e2 = TOASTS[used++];
        const d = t - ts.t0,
          dl = ts.t1 - t;
        const k = clamp(0, 1, Math.min(d / 0.22, dl / 0.25));
        setText(e2, commitText(ts.c));
        setStyle(e2, "opacity", k.toFixed(2));
        setStyle(
          e2,
          "transform",
          `translate(0, ${(-stack * 52 + (1 - EASE_OUT(k)) * 8).toFixed(1)}px) scale(${(0.94 + 0.06 * EASE_OUT(k)).toFixed(3)})`,
        );
        stack++;
      }
      for (let i = used; i < TOASTS.length; i++)
        setStyle(TOASTS[i], "opacity", 0);
    }
    // terminal (mode B)
    termShown = false;
    if (ep.term) {
      const T = ep.term,
        onT = t >= T.t0 && t < T.t1;
      const d = onT ? t - T.t0 : 0;
      const k = onT ? clamp(0, 1, Math.min(d / 0.28, (T.t1 - t) / 0.3)) : 0;
      setStyle(termEl, "opacity", k.toFixed(2));
      termShown = k > 0;
      setStyle(
        termEl,
        "transform",
        `translate(${((1 - EASE_OUT(k)) * 10).toFixed(1)}px, ${((1 - EASE_OUT(k)) * -6).toFixed(1)}px) scale(${(0.96 + 0.04 * EASE_OUT(k)).toFixed(3)})`,
      );
      if (onT) {
        const vis = [];
        for (const l of ep.termLines) {
          if (t < l.t) {
            setStyle(l.el, "display", "none");
            continue;
          }
          vis.push(l);
          let txt = "",
            cls = "ln";
          if (l.key === "commit") {
            txt = "✓ " + commitText(l.c!);
            cls += " c";
          } else if (l.key === "tests" || l.key === "rerun") {
            const run = l.key === "rerun" ? ep.tests!.rerun! : ep.tests!;
            const n = Math.min(24, Math.round(prog(t, run.t0, run.t1) * 24));
            txt =
              "$ " +
              (l.key === "rerun" ? L.term.rerun : L.term.tests) +
              "   " +
              fmt(L.term.wait, { n });
            cls += " c";
          } else if (l.key === "fail") {
            txt = fmt(L.term.fail, { n: 23 });
            cls += " bad";
          } else if (l.key === "pass") {
            txt = fmt(L.term.pass, { n: 24 });
            cls += " ok";
          } else if (l.key === "deploy") {
            txt = L.term.deploy;
            cls += " ok";
          }
          setText(l.el, txt);
          setAttr(l.el, "class", cls);
        }
        let budget = 4;
        const keep = new Set();
        for (let i = vis.length - 1; i >= 0; i--) {
          const rows = Math.max(
            1,
            Math.ceil(String(cache.get(vis[i].el)?.text || "").length / 31),
          );
          if (budget - rows < 0) break;
          budget -= rows;
          keep.add(vis[i]);
        }
        vis.forEach((l) =>
          setStyle(l.el, "display", keep.has(l) ? "" : "none"),
        );
      }
    }
    // deployed chip (+ progress in mode C)
    {
      const tp = testProgress(t);
      const dep = t - ep.deployed;
      let txt = L.deployed,
        cls = "",
        bar = 0,
        show = false,
        s = 1;
      if (ep.mode === "C" && tp && tp.run && t < ep.deployed) {
        show = true;
        if (tp.fail) {
          cls = "failing";
          txt = "23/24 ✗";
          bar = 23 / 24;
        } else if (!tp.done) {
          cls = "running";
          txt = fmt(L.term.wait, { n: tp.n });
          bar = tp.n / 24;
        } else if (t < ep.deployStart) {
          cls = "running";
          txt = "24/24 ✓";
          bar = 1;
        } else {
          cls = "running";
          txt = L.deploying + "…";
          bar = prog(t, ep.deployStart, ep.deployed);
        }
      } else if (dep >= 0) {
        show = true;
        s = 0.6 + 0.4 * SPR_CHIP(dep);
      }
      let o = show ? 1 : 0;
      if (ep.mode === "C" && show && dep < 0)
        o = clamp(0, 1, (t - ep.tests!.t0) / 0.2);
      o *= 1 - col(0.3);
      setText(chipOkTxt, txt);
      setCls(chipOk, "running", cls === "running");
      setCls(chipOk, "failing", cls === "failing");
      setStyle(chipOkBar, "transform", `scaleX(${bar.toFixed(3)})`);
      setStyle(chipOkBar, "width", "100%");
      setStyle(chipOk, "transform", `scale(${s.toFixed(3)})`);
      setStyle(chipOk, "opacity", o.toFixed(2));
      chipShown = o > 0;
      const ring = chipOk.firstElementChild!,
        rp = clamp(0, 1, dep / 1.1);
      setStyle(ring, "transform", `scale(${(1 + rp * 0.9).toFixed(3)})`);
      setStyle(
        ring,
        "opacity",
        dep >= 0 ? (0.6 * (1 - EASE_OUT(rp))).toFixed(2) : 0,
      );
    }
    // git log --graph: each row slides down as newer ones arrive above it, fades past the 6th
    {
      const out = col(0.3);
      const pres = (r: LogRow) =>
        SLIDE(prog(t, r.t0, r.t0 + dIn)) *
        (r.t1 === Infinity ? 1 : 1 - SLIDE(prog(t, r.t1, r.t1 + dIn)));
      let below = 0,
        maxY = -1;
      for (let i = LOG.length - 1; i >= 0; i--) {
        const { r, el: row, msg } = LOG[i],
          y = below;
        below += LOG_ROW * pres(r);
        const shown = t >= r.t0 && (r.t1 === Infinity || t < r.t1 + dOut);
        if (!shown) {
          setStyle(row, "display", "none");
          continue;
        }
        const pIn = prog(t, r.t0, r.t0 + dIn),
          pop = POP(pIn);
        const op =
          clamp(0, 1, pIn / 0.5) *
          (r.t1 === Infinity ? 1 : 1 - prog(t, r.t1, r.t1 + dOut)) *
          clamp(0, 1, LOG_MAX - y / LOG_ROW);
        setStyle(row, "display", "");
        setStyle(row, "opacity", op.toFixed(2));
        setStyle(
          row,
          "transform",
          `translate(0, ${(y - (1 - pop) * 8).toFixed(1)}px) scale(${(0.9 + 0.1 * pop).toFixed(3)})`,
        );
        setText(
          row.children[1],
          r.kind === "wip" ? GIT.wip : r.kind === "head" ? GIT.head : r.id,
        );
        setText(msg, fmt(L.log[r.key as keyof HeroDict["log"]], r.vars || {}));
        if (op > 0.05)
          maxY = Math.max(maxY, Math.min(y, (LOG_MAX - 1) * LOG_ROW));
      }
      setStyle(railEl, "height", Math.max(0, maxY).toFixed(1) + "px");
      setStyle(glogEl, "opacity", (maxY < 0 ? 0 : 1 - out).toFixed(2));
      // htop-style bars: load rises on the layer someone is working on, red while it has an open
      // mistake, and settles once deployed (decorative)
      const settle = EASE_IO(prog(t, ep.deployed, ep.deployed + 1.2));
      LAYERS.forEach((l, i) => {
        let heat = 0;
        for (const w of WORK)
          if (w.l === l)
            heat = Math.max(
              heat,
              prog(t, w.t0 - 0.2, w.t0 + 0.3) *
                (1 - prog(t, w.t1 + 0.8, w.t1 + 2.4)),
            );
        const v = clamp(
          0.02,
          0.98,
          lerp(
            BAR_WORK[i] + 0.45 * heat + 0.04 * Math.sin(t * 1.7 + i * 2),
            BAR_IDLE[i] + 0.03 * Math.sin(t * 0.9 + i),
            settle,
          ),
        );
        const bad =
          t < ep.deployed &&
          (ep.chips.some((c) => c.pt.layer === l && t >= c.t0 && t < c.t1) ||
            ep.nodes.some(
              (n) =>
                n.cx != null &&
                n.cur.layer === l &&
                n.flags.some((f) => t >= f.t0 && t < f.t1),
            ));
        const B = BARS[i],
          n = Math.round(v * BAR);
        setText(B.bar, "|".repeat(n) + " ".repeat(BAR - n));
        setText(B.val, String(Math.round(v * 100)).padStart(3) + "%");
        setCls(B.bar, "bad", bad);
      });
      setStyle(barsEl, "opacity", (1 - out).toFixed(2));
    }
    {
      const showRb =
        t >= ep.MAIN && !(ep.collapse && t >= ep.collapse.t0) && !isStatic();
      if (ended !== showRb) {
        ended = showRb;
        onEnded(showRb);
      }
    }

    // ---- actors (screen space, targets projected through P)
    for (const key of ["ia", "fb"] as const) {
      const a = ep.actors[key],
        ui = UI[key];
      let pos = posAt(a, t, humanK);
      if (key === "fb" && wd) pos = { x: wd.x, y: wd.y };
      if (key === "fb" && egg.fb)
        pos = {
          x: lerp(pos.x, egg.fb.x, egg.fb.w),
          y: lerp(pos.y, egg.fb.y, egg.fb.w),
        };
      let sx = 1,
        sy = 1;
      for (const c of a.clicks) {
        const d = t - c.t;
        if (d < -0.09 || d > 0.4) continue;
        const amp = 0.14 + 0.16 * hot;
        if (d < 0) {
          const p = EASE_IO(1 + d / 0.09);
          sx = 1 + amp * 0.3 * p;
          sy = 1 - amp * p;
        } else {
          const k = SPR_DROP(d);
          sx = lerp(1 + amp * 0.3, 1, k);
          sy = lerp(1 - amp, 1, k);
        }
        const cp = P(c.pt),
          rp = clamp(0, 1, d / 0.42),
          rr = 5 + (18 + 16 * hot) * EASE_OUT(rp);
        setAttr(ui.ripple, "cx", cp.x.toFixed(1));
        setAttr(ui.ripple, "cy", cp.y.toFixed(1));
        setAttr(ui.ripple, "r", rr.toFixed(1));
        setAttr(ui.ripple, "opacity", d < 0 ? 0 : (0.7 * (1 - rp)).toFixed(2));
        a.rippleUntil = t;
      }
      if (a.rippleUntil !== t) setAttr(ui.ripple, "opacity", 0);
      const first = a.moves[0];
      let op = first ? clamp(0, 1, (t - first.t0) / 0.25) : 0;
      if (a.fade) op *= 1 - EASE_IO(prog(t, a.fade.t0, a.fade.t1));
      setStyle(ui.el, "opacity", op.toFixed(2));
      ui.pos = pos;
      setStyle(
        ui.el,
        "transform",
        `translate(${pos.x.toFixed(2)}px, ${pos.y.toFixed(2)}px)`,
      );
      setStyle(
        ui.svg,
        "transform",
        `scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`,
      );
      let say: { key: string; t0: number; t1: number } | null = null;
      for (const s of a.says) if (t >= s.t0 && t < s.t1) say = s;
      let sayNow = t;
      if (key === "fb" && egg.say) {
        const pn = performance.now() / 1000;
        if (pn >= egg.say.t0 && pn < egg.say.t1) {
          say = egg.say;
          sayNow = pn;
        } else if (pn >= egg.say.t1) egg.say = null;
      }
      let flip = pos.x > STAGE_W - 170;
      if (say) {
        const txt = bubbleText(say.key, t),
          bw = txt.length * 6.6 + 18,
          bh = 22;
        const rectFor = (left: boolean): Box => {
          const x0 = left ? pos.x - 4 - bw : pos.x + 13;
          return { x0, x1: x0 + bw, y0: pos.y + 37, y1: pos.y + 37 + bh };
        };
        const covers = (r: Box) =>
          ep.nodes.some(
            (n) =>
              n.cx != null &&
              r.x0 < n.cx + n.w * 0.45 &&
              r.x1 > n.cx - n.w * 0.45 &&
              r.y0 < n.cy + NH * 0.5 &&
              r.y1 > n.cy - NH * 0.5,
          );
        const st =
          a.sayState && a.sayState.say === say
            ? a.sayState
            : (a.sayState = { say, since: null, flipped: null });
        if (st.flipped != null) flip = st.flipped;
        else if (onWidget(rectFor(flip)) && !onWidget(rectFor(!flip))) {
          st.flipped = !flip;
          flip = !flip;
        } else if (covers(rectFor(flip))) {
          if (st.since == null) st.since = sayNow;
          if (
            sayNow - st.since > 1 &&
            !covers(rectFor(!flip)) &&
            !onWidget(rectFor(!flip))
          ) {
            st.flipped = !flip;
            flip = !flip;
          }
        } else st.since = null;
      }
      setCls(ui.el, "flip", flip);
      if (say) {
        const d = sayNow - say.t0,
          dl = say.t1 - sayNow,
          k = clamp(0, 1, Math.min(d / 0.16, dl / 0.14, 1));
        setText(ui.bubble, bubbleText(say.key, t));
        setStyle(ui.bubble, "opacity", k.toFixed(2));
        setStyle(
          ui.bubble,
          "transform",
          `scale(${(0.9 + 0.1 * EASE_OUT(k)).toFixed(3)}) translateY(${((1 - k) * -3).toFixed(1)}px)`,
        );
      } else setStyle(ui.bubble, "opacity", 0);
      // speed FX
      const dtF = 0.016 * sp,
        prev = wd || egg.fb || egg.drag ? pos : posAt(a, t - dtF, humanK),
        vx = pos.x - prev.x,
        vy = pos.y - prev.y,
        v = Math.hypot(vx, vy);
      const vis = clamp(0, 1, (v - 2.5) / 14) * hot * op;
      for (let i = 0; i < ui.ghosts.length; i++) {
        const g = ui.ghosts[i];
        setStyle(
          g,
          "opacity",
          (vis * 0.45 * (1 - i / ui.ghosts.length)).toFixed(2),
        );
        if (vis > 0) {
          const gp = posAt(a, t - dtF * (i + 1) * 1.15, humanK);
          setStyle(
            g,
            "transform",
            `translate(${gp.x.toFixed(1)}px, ${gp.y.toFixed(1)}px)`,
          );
        }
      }
      setAttr(ui.smear, "opacity", (vis * 0.5).toFixed(2));
      if (vis > 0) {
        const sm = posAt(a, t - dtF * 2.2, humanK);
        setAttr(ui.smear, "x1", sm.x.toFixed(1));
        setAttr(ui.smear, "y1", sm.y.toFixed(1));
        setAttr(ui.smear, "x2", pos.x.toFixed(1));
        setAttr(ui.smear, "y2", pos.y.toFixed(1));
      }
      const sl = clamp(0, 1, (v - 14) / 30) * hot * op;
      for (let i = 0; i < 3; i++) {
        const ln = ui.speed[i];
        setAttr(ln, "opacity", (sl * 0.55 * (i === 1 ? 1 : 0.6)).toFixed(2));
        if (sl > 0) {
          const nx = -vy / (v || 1),
            ny = vx / (v || 1),
            offS = (i - 1) * 9,
            bx = pos.x + nx * offS - vx * 1.2,
            by = pos.y + ny * offS - vy * 1.2,
            len = 18 + v * 1.6 * (i === 1 ? 1 : 0.7);
          setAttr(ln, "x1", bx.toFixed(1));
          setAttr(ln, "y1", by.toFixed(1));
          setAttr(ln, "x2", (bx - (vx / v) * len).toFixed(1));
          setAttr(ln, "y2", (by - (vy / v) * len).toFixed(1));
        }
      }
    }
  }

  /* =====================================================================
     Master timeline (Motion) + lifecycle
     ===================================================================== */
  let master: Controls | null = null,
    speedAnim: Controls | null = null,
    lastT = 0,
    ticker: number | null = null,
    epCount = 0,
    inView = true,
    masterHold: number | null = null;
  // Motion 12.23 JSAnimation: pause()/play() with playbackSpeed ≠ 1 shifts the time by the speed factor → restore the time explicitly.
  function pauseMaster() {
    if (!master || master.state !== "running") return;
    masterHold = master.time;
    master.pause();
  }
  function playMaster() {
    if (!master || master.state !== "paused") return;
    master.play();
    if (masterHold != null) master.time = masterHold;
    masterHold = null;
  }
  // watchdog: whatever happens inside the easter egg, the clock must come back — a paused master with nothing busy is resumed, a final episode without its ticker gets it back
  const watchdog = window.setInterval(() => {
    if (
      !ep ||
      isStatic() ||
      egg.busy ||
      egg.drag ||
      egg.fixing ||
      document.hidden ||
      !inView
    )
      return;
    if (master && master.state === "paused") {
      stopTicker();
      playMaster();
    } else if (!master && ep.isFinal && !ticker) startTicker();
  }, 1000);
  const mobile = matchMedia("(max-width: 760px)");
  const isStatic = () => staticMode || mobile.matches;
  const phase = () =>
    !ep
      ? "none"
      : lastT >= ep.MAIN && (!ep.collapse || lastT < ep.collapse.t0)
        ? "idle"
        : "play";

  function startEpisode(seed: number, index: number) {
    if (master) {
      master.stop();
      master = null;
    }
    stopTicker();
    egg.drag = null;
    egg.back = null;
    egg.settle = null;
    egg.fb = null;
    egg.say = null;
    egg.hold = {};
    egg.queue = [];
    egg.fixing = false;
    egg.busy = false;
    glowCache = -1;
    if (egg.banTimer) {
      clearTimeout(egg.banTimer);
      liftBan();
    }
    ep = buildEpisode(
      seed,
      index,
      UI.fb.pos && index > 0 ? { sx: UI.fb.pos.x, sy: UI.fb.pos.y } : null,
      textW,
      lsGet(),
    );
    lsSet(ep.errors.join());
    buildDOM(ep);
    lastT = 0;
    if (isStatic()) {
      render(ep.MAIN + 2.2);
      lastT = ep.MAIN + 2.2;
      return;
    }
    master = animate(0, ep.END, {
      duration: ep.END,
      ease: "linear",
      onUpdate: (t: number) => {
        lastT = t;
        render(t);
        if (egg.busy && ep.idle && t >= ep.idle.t1 - 0.3) pauseMaster();
      },
      onComplete: onEpisodeEnd,
    });
    master.speed = S.speed;
    if (!inView || document.hidden) pauseMaster();
  }
  function onEpisodeEnd() {
    if (!ep || signal.aborted) return;
    if (!ep.isFinal) {
      epCount++;
      try {
        startEpisode(nextSeed(ep.seed), epCount);
      } catch (err) {
        console.error("episode build failed, trying another seed", err);
        startEpisode(nextSeed(nextSeed(ep.seed)), epCount);
      }
    } else startTicker(); // final: minimal life forever (pure function of a running clock)
  }
  function startTicker() {
    if (ticker) return;
    let last = performance.now();
    const tick = (now: number) => {
      ticker = requestAnimationFrame(tick);
      if (!inView || document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!(egg.busy && ep.idle && lastT >= ep.idle.t1 - 0.3 && !ep.isFinal))
        lastT += dt * S.speed;
      render(lastT);
    };
    ticker = requestAnimationFrame(tick);
  }
  function stopTicker() {
    if (ticker) cancelAnimationFrame(ticker);
    ticker = null;
  }
  function setSpeed(target: number) {
    if (speedAnim) speedAnim.stop();
    const from = S.speed;
    speedAnim = anim(from, target, {
      duration: target > from ? 0.75 : 1.05,
      ease: target > from ? [0.3, 0, 0.1, 1] : [0.22, 1, 0.36, 1],
      onUpdate: (v: number) => {
        S.speed = v;
        if (master) master.speed = v;
      },
    });
  }

  /* ---- interaction: hover 2×, the turbo key (HeroScene) 4× while held ---- */
  let hover = false,
    boost = false,
    ended = false;
  const applySpeed = () => setSpeed(boost ? 4 : hover ? 2 : 1);
  const toStage = (e: PointerEvent) => {
    const r = stage.getBoundingClientRect(),
      s = r.width / STAGE_W;
    return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
  };
  let eggs: EggApi | null = null,
    eggsLoading = false;
  const eggSay = (key: string, dur: number) => {
    const pn = performance.now() / 1000;
    egg.say = { key, t0: pn, t1: pn + dur };
  };
  function liftBan() {
    egg.banned = false;
    egg.saidAngry = false;
    egg.messed = 0;
    egg.banTimer = null;
    trackYou();
  }
  // while the egg is busy the master may still be running; if it reached the hold point it is paused and resumed by settle()
  function settle() {
    if (egg.drag || egg.fixing) return;
    egg.busy = false;
    if (!ep.isFinal && master) {
      stopTicker();
      playMaster();
    }
  }
  function loadEggs() {
    if (eggs || eggsLoading) return;
    eggsLoading = true;
    import("./eggs").then(({ install }) => {
      if (signal.aborted) return;
      eggs = install({
        egg,
        ep: () => ep,
        scene,
        signal,
        ui: { fbPos: () => UI.fb.pos, youEl },
        isStatic,
        phase,
        toStage,
        eggSay,
        setAttr,
        anim,
        later,
        hasMaster: () => !!master,
        startTicker,
        settle,
        liftBan,
      });
    });
  }
  on(scene, "pointerenter", () => {
    if (isStatic()) return;
    loadEggs();
    hover = true;
    applySpeed();
  });
  on(scene, "pointerleave", () => {
    hover = false;
    PX.on = false;
    if (!isStatic()) applySpeed();
    eggs?.leave();
  });
  on(scene, "pointermove", (e: PointerEvent) => {
    if (isStatic()) return;
    loadEggs();
    const p = toStage(e);
    PX.tx = clamp(-1, 1, (p.x / STAGE_W - 0.5) * 2);
    PX.ty = clamp(-1, 1, (p.y / STAGE_H - 0.5) * 2);
    PX.on = true;
    eggs?.move(p);
  });
  // the You cursor follows the pointer anywhere on the hero, while scrolling too (no pointermove
  // then). It hides the visitor's own cursor (data-you, Hero.module.css) except once the drag egg
  // has banned it: then the real one comes back instead of leaving no cursor at all.
  let ptr: PointerEvent | null = null;
  function trackYou() {
    const r = zone.getBoundingClientRect(),
      show =
        !!ptr &&
        !isStatic() &&
        !egg.banned &&
        ptr.clientX >= r.left &&
        ptr.clientX < r.right &&
        ptr.clientY >= r.top &&
        ptr.clientY < r.bottom;
    zone.toggleAttribute("data-you", show);
    if (egg.grab) return;
    youEl.style.opacity = show ? "1" : "0";
    if (show) placeYou((egg.you = toStage(ptr!)));
  }
  on(zone, "pointermove", (e: PointerEvent) => {
    ptr = e;
    trackYou();
  });
  on(zone, "pointerleave", () => {
    ptr = null;
    trackYou();
  });
  on(window, "scroll", trackYou);
  const io = new IntersectionObserver(
    ([en]) => {
      inView = en.isIntersecting;
      if (!master) return;
      if (inView && !isStatic() && !egg.busy) playMaster();
      else pauseMaster();
    },
    { threshold: 0.15 },
  );
  io.observe(scene);
  on(document, "visibilitychange", () => {
    if (!master) return;
    if (document.hidden) pauseMaster();
    else if (inView && !egg.busy) playMaster();
  });

  /* ---- language ---- */
  function applyLang(d: HeroDict) {
    L = d;
    (youEl.querySelector(".name") as HTMLElement).textContent = L.you;
    UI.ia.name.textContent = L.ia;
    UI.fb.name.textContent = L.fb;
    cache.clear();
    if (ep) render(lastT);
  }

  /* ---- boot ---- */
  const dev = process.env.NODE_ENV === "development";
  const urlSeed = dev
    ? parseInt(new URLSearchParams(location.search).get("seed") ?? "", 10)
    : NaN;
  const seed0 = isNaN(urlSeed)
    ? (Date.now() ^ (Math.random() * 1e9)) >>> 0
    : urlSeed >>> 0;
  const restart = () => {
    epCount = 0;
    startEpisode(ep ? ep.seed : seed0, 0);
  };
  on(mobile, "change", restart);
  resetView();
  Promise.race([
    document.fonts.ready,
    new Promise((r) => setTimeout(r, 1500)),
  ]).then(() => {
    if (signal.aborted) return;
    measureCache.clear();
    applyLang(L);
    epCount = 0;
    startEpisode(seed0, 0);
  });

  // debug / e2e hooks: dev builds, or when a test sets window.__HERO_TEST__ before load
  const w = window as unknown as Record<string, unknown>;
  if (dev || w.__HERO_TEST__) {
    w.__hero = {
      get ep() {
        return ep;
      },
      get seed() {
        return ep && ep.seed;
      },
      P,
      get speed() {
        return S.speed;
      },
      get phase() {
        return phase();
      },
      seek: (t: number) => {
        if (master) {
          pauseMaster();
          masterHold = Math.min(t, ep.END - 0.01);
          master.time = masterHold;
        }
        lastT = t;
        render(t);
      },
      resume: () => playMaster(),
      egg,
    };
  }

  return {
    setLocale: applyLang,
    setTurbo(on: boolean) {
      boost = on;
      hover = scene.matches(":hover");
      if (!isStatic()) applySpeed();
    },
    replay() {
      if (isStatic() || !ep) return;
      epCount = 0;
      startEpisode(nextSeed(ep.seed), 0);
    },
    setStill(s: boolean) {
      if (s === staticMode) return;
      staticMode = s;
      if (ep) restart();
    },
    destroy() {
      ac.abort();
      io.disconnect();
      clearInterval(watchdog);
      timers.forEach(clearTimeout);
      anims.forEach((c) => c.stop());
      master?.stop();
      stopTicker();
      if (w.__hero) delete w.__hero;
      host.replaceChildren();
      youLayer.remove();
      zone.removeAttribute("data-you");
      delete host.dataset.engine;
    },
  };
}
