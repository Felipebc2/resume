/* Hero scene: the pure half (no DOM). Geometry, the seeded RNG, the orthogonal router and the
   episode generator. Ported 1:1 from docs/prototypes/hero-motion-v4.4.html — keep the RNG call
   order intact, sample(seed) must match the prototype's __hero.sample(seed). */
import { clamp, cubicBezier, spring } from "motion";
import {
  DOMAINS,
  LAYER_TITLES,
  type DomainKey,
  type IconKey,
} from "@/content/hero";

export type Ease = (t: number) => number;
export type Layer = "fw" | "ia" | "uc" | "en";
type Band = "top" | "bottom" | "mid";
export interface XY {
  x: number;
  y: number;
}
/** a point on a plate (z from its layer) */
export interface Pt3 {
  layer: Layer;
  lx: number;
  ly: number;
  dz?: number;
}
/** a point in screen (stage) space */
export interface Scr {
  sx: number;
  sy: number;
}
export type Pt = Pt3 | Scr;

/* =====================================================================
   Geometry — 4 isometric plates in an exploded stack (desktop only).
   ===================================================================== */
export const NH = 52; // node height (plate units)
export const STAGE_W = 724,
  STAGE_H = 800;
export const GAP = 165,
  TH = 18,
  K = 0.84,
  CX = 362,
  CY = 552;
export const LAYERS: Layer[] = ["fw", "ia", "uc", "en"];
export const LI: Record<Layer, number> = { fw: 0, ia: 1, uc: 2, en: 3 };
interface Plate {
  title: string;
  cls: string;
  w: number;
  h: number;
  rows: Partial<Record<Band, number>>;
  slots: Partial<Record<Band, number[]>>;
  extra: Partial<Record<Band, [number, number]>>;
}
// rows sit toward the FRONT of each plate so nodes and riser heads are not hidden by the plate above
export const PLATES: Record<Layer, Plate> = {
  fw: {
    title: LAYER_TITLES.fw,
    cls: "l1",
    w: 520,
    h: 460,
    rows: { top: 290, bottom: 400 },
    slots: { top: [135, 300], bottom: [140, 320] },
    extra: { top: [440, 290], bottom: [440, 290] },
  },
  ia: {
    title: LAYER_TITLES.ia,
    cls: "l2",
    w: 450,
    h: 390,
    rows: { top: 245, bottom: 335 },
    slots: { top: [225], bottom: [130, 335] },
    extra: { top: [390, 245], bottom: [390, 245] },
  },
  uc: {
    title: LAYER_TITLES.uc,
    cls: "l3",
    w: 400,
    h: 330,
    rows: { top: 195, bottom: 275 },
    slots: { top: [140], bottom: [255] },
    extra: { top: [300, 195], bottom: [300, 195] },
  },
  en: {
    title: LAYER_TITLES.en,
    cls: "l4",
    w: 330,
    h: 250,
    rows: { mid: 160 },
    slots: { mid: [] },
    extra: { mid: [260, 60] },
  },
};
export const LAYER_ORDER: Layer[] = ["en", "uc", "ia", "fw"];
// projection state (parallax changes yaw/pitch; the collapse/breathing change the per-layer z)
export const VIEW = {
  yaw: 0,
  pitch: 0,
  z: { fw: 0, ia: GAP, uc: 2 * GAP, en: 3 * GAP } as Record<Layer, number>,
  dy: { fw: 0, ia: 0, uc: 0, en: 0 } as Record<Layer, number>,
};
export function resetView() {
  VIEW.yaw = VIEW.pitch = 0;
  for (const l of LAYERS) {
    VIEW.z[l] = LI[l] * GAP;
    VIEW.dy[l] = 0;
  }
}
export function uvOf(layer: Layer, lx: number, ly: number) {
  const Pl = PLATES[layer];
  return { u: ly - Pl.h / 2, v: -(lx - Pl.w / 2) };
}
export function lxyOf(layer: Layer, u: number, v: number) {
  const Pl = PLATES[layer];
  return { lx: Pl.w / 2 - v, ly: u + Pl.h / 2 };
}
export function projUV(u: number, v: number, z: number, layer?: Layer): XY {
  const cs = Math.cos(VIEW.yaw),
    sn = Math.sin(VIEW.yaw);
  const u2 = u * cs - v * sn,
    v2 = u * sn + v * cs;
  const m = 0.5 * K * (1 + VIEW.pitch);
  return {
    x: CX + (u2 - v2) * 0.866 * K,
    y: CY - z * K + (u2 + v2) * m + (layer ? VIEW.dy[layer] : 0),
  };
}
export function P(pt: Pt): XY {
  if ("sx" in pt) return { x: pt.sx, y: pt.sy };
  const { u, v } = uvOf(pt.layer, pt.lx, pt.ly);
  return projUV(u, v, VIEW.z[pt.layer] + (pt.dz || 0), pt.layer);
}
// affine matrix of a plate's top face: local (lx, ly) → screen
export function faceMatrix(layer: Layer) {
  const o = P({ layer, lx: 0, ly: 0 }),
    ex = P({ layer, lx: 1, ly: 0 }),
    ey = P({ layer, lx: 0, ly: 1 });
  return {
    a: ex.x - o.x,
    b: ex.y - o.y,
    c: ey.x - o.x,
    d: ey.y - o.y,
    e: o.x,
    f: o.y,
  };
}
export function toLocal(layer: Layer, x: number, y: number) {
  const m = faceMatrix(layer);
  const det = m.a * m.d - m.b * m.c;
  const dx = x - m.e,
    dy = y - m.f;
  return { lx: (dx * m.d - dy * m.c) / det, ly: (m.a * dy - m.b * dx) / det };
}

export const ERROR_POOL = [
  "dep",
  "wrongLayer",
  "typo",
  "failing",
  "circular",
  "dup",
  "hal",
  "orphan",
  "naming",
] as const;
export type ErrorKey = (typeof ERROR_POOL)[number];
const MICRO_POOL = [
  "undo",
  "pin",
  "sameNode",
  "guides",
  "marquee",
  "typeDelete",
] as const;
type Micro = (typeof MICRO_POOL)[number];

/* ---- seeded RNG ---- */
export function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// murmur3 finalizer: small seeds stop being biased
export function fmix32(h: number) {
  h >>>= 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}
export function makeR(seed: number) {
  const rng = mulberry32(fmix32(seed));
  return {
    rng,
    pick: <T>(a: readonly T[]) => a[Math.floor(rng() * a.length)],
    range: (a: number, b: number) => a + rng() * (b - a),
    J: (d: number) => d * (1 + (rng() * 2 - 1) * 0.12),
    chance: (p: number) => rng() < p,
    shuffle: <T>(a: readonly T[]) => {
      const b = a.slice();
      for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
      }
      return b;
    },
  };
}
export const nextSeed = (s: number) =>
  (Math.imul(s, 1664525) + 1013904223) >>> 0;

/** `last`: the previous episode's errors (joined), avoided so two visits in a row differ */
function drawParams(seed: number, last: string) {
  const R = makeR(seed);
  const domainKey = R.pick(Object.keys(DOMAINS) as DomainKey[]);
  let errors: ErrorKey[],
    tries = 0;
  do {
    errors = R.shuffle(ERROR_POOL).slice(0, 3).sort();
  } while (errors.join() === last && tries++ < 30);
  const micros: Micro[] = R.shuffle(MICRO_POOL).slice(
    0,
    Math.floor(R.rng() * 4),
  );
  const mode = R.chance(0.5) ? "B" : "C";
  return { R, domainKey, errors, micros, mode };
}
export const sample = (s: number) => {
  const p = drawParams(s >>> 0, "");
  return {
    domain: p.domainKey,
    errors: p.errors,
    micros: p.micros,
    mode: p.mode,
  };
};

/* =====================================================================
   Easing
   ===================================================================== */
export const EASE_MOVE = cubicBezier(0.36, 0.02, 0.12, 1);
export const EASE_DRAG = cubicBezier(0.3, 0, 0.18, 1);
export const EASE_OUT = cubicBezier(0.22, 1, 0.36, 1);
export const EASE_IO = cubicBezier(0.65, 0, 0.35, 1);
const OVER = new Map<number, Ease>();
export function overshootEase(k: number) {
  const q = Math.round(k * 50) / 50;
  if (!OVER.has(q)) OVER.set(q, cubicBezier(0.55, -0.7 * q, 0.18, 1 + q));
  return OVER.get(q)!;
}
function makeSpring(stiffness: number, damping: number) {
  const g = spring({ keyframes: [0, 1], stiffness, damping, mass: 1 });
  return (s: number) => g.next(Math.max(0, s) * 1000).value;
}
export const SPR_POP = makeSpring(520, 22),
  SPR_SNAP = makeSpring(700, 18),
  SPR_CHIP = makeSpring(420, 20),
  SPR_DROP = makeSpring(600, 16),
  SPR_BACK = makeSpring(300, 14);
export const qbez = (p0: XY, c: XY, p1: XY, t: number) => {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
    y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y,
  };
};
export const prog = (t: number, t0: number, t1: number) =>
  clamp(0, 1, (t - t0) / Math.max(1e-6, t1 - t0));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/* =====================================================================
   Orthogonal router — grid A* with bend penalty and lane spreading.
   Runs at episode build (not per frame).
   ===================================================================== */
type Side = "top" | "bottom" | "left" | "right";
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  pad?: number;
}
export type Obstacles = Rect[] & { bounds?: Rect };
/** what the router needs of a node: centre (px/py, else x/y) and width */
interface Routable {
  px?: number;
  py?: number;
  x?: number;
  y?: number;
  w: number;
}
const CELL = 8,
  COLS = 80,
  ROWS = 60;
const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const SIDE_N: Record<Side, [number, number]> = {
  top: [0, -1],
  bottom: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
const SIDE_D: Record<Side, number> = { right: 0, left: 1, bottom: 2, top: 3 };
export function makeRouter(obstacles: Obstacles) {
  const blocked = new Uint8Array(COLS * ROWS),
    used = new Uint8Array(COLS * ROWS);
  const block = (x: number, y: number, w: number, h: number, pad: number) => {
    const c0 = Math.max(0, Math.floor((x - pad) / CELL)),
      c1 = Math.min(COLS - 1, Math.floor((x + w + pad) / CELL)),
      r0 = Math.max(0, Math.floor((y - pad) / CELL)),
      r1 = Math.min(ROWS - 1, Math.floor((y + h + pad) / CELL));
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) blocked[r * COLS + c] = 1;
  };
  obstacles.forEach((o) => block(o.x, o.y, o.w, o.h, o.pad ?? 10));
  // soft penalty for cells hugging the plate border (keeps arrows away from the edge)
  const edge = new Uint8Array(COLS * ROWS);
  if (obstacles.bounds) {
    const f = obstacles.bounds;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const cx = c * CELL + CELL / 2,
          cy = r * CELL + CELL / 2;
        if (cx < f.x || cx > f.x + f.w || cy < f.y || cy > f.y + f.h) {
          blocked[r * COLS + c] = 1;
          continue;
        }
        const d = Math.min(cx - f.x, f.x + f.w - cx, cy - f.y, f.y + f.h - cy);
        edge[r * COLS + c] = d < 14 ? 6 : d < 24 ? 2 : 0;
      }
  }
  const cellOf = (p: XY) => [
    clamp(0, COLS - 1, Math.floor(p.x / CELL)),
    clamp(0, ROWS - 1, Math.floor(p.y / CELL)),
  ];
  const g = new Float32Array(COLS * ROWS * 4),
    came = new Int32Array(COLS * ROWS * 4),
    closed = new Uint8Array(COLS * ROWS * 4);
  function astar(sc: number[], sd: number, tc: number[], allow: Set<number>) {
    g.fill(1e9);
    came.fill(-1);
    closed.fill(0);
    const heap: [number, number][] = [];
    const push = (f: number, s: number) => {
      heap.push([f, s]);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p][0] <= heap[i][0]) break;
        [heap[p], heap[i]] = [heap[i], heap[p]];
        i = p;
      }
    };
    const pop = () => {
      const top = heap[0],
        last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1,
            r = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]];
          i = m;
        }
      }
      return top;
    };
    const h = (c: number, r: number) =>
      Math.abs(c - tc[0]) + Math.abs(r - tc[1]);
    const s0 = (sc[1] * COLS + sc[0]) * 4 + sd;
    g[s0] = 0;
    push(h(sc[0], sc[1]), s0);
    let best = -1,
      iter = 0;
    while (heap.length && iter++ < 40000) {
      const [, s] = pop();
      if (closed[s]) continue;
      closed[s] = 1;
      const cell = s >> 2,
        d = s & 3,
        c = cell % COLS,
        r = (cell / COLS) | 0;
      if (c === tc[0] && r === tc[1]) {
        best = s;
        break;
      }
      for (let nd = 0; nd < 4; nd++) {
        if ((nd ^ 1) === d) continue; // no U-turn
        const nc = c + DIRS[nd][0],
          nr = r + DIRS[nd][1];
        if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
        const ncell = nr * COLS + nc;
        if (blocked[ncell] && !allow.has(ncell)) continue;
        const ns = ncell * 4 + nd;
        if (closed[ns]) continue;
        const cost = 1 + (nd !== d ? 6 : 0) + used[ncell] * 1.5 + edge[ncell];
        const ng = g[s] + cost;
        if (ng < g[ns]) {
          g[ns] = ng;
          came[ns] = s;
          push(ng + h(nc, nr), ns);
        }
      }
    }
    if (best < 0) return null;
    const cells: number[] = [];
    for (let s = best; s >= 0; s = came[s]) cells.push(s >> 2);
    cells.reverse();
    return { cells, cost: g[best] };
  }
  return {
    route(from: Routable, to: Routable, sides: { s: Side; t: Side }[]) {
      let bestR: {
        cells: number[];
        cost: number;
        sp: XY;
        tp: XY;
        s: Side;
        t: Side;
      } | null = null;
      for (const cand of sides) {
        const sp = portOf(from, cand.s),
          tp = portOf(to, cand.t);
        const sOut = {
            x: sp.x + SIDE_N[cand.s][0] * 11,
            y: sp.y + SIDE_N[cand.s][1] * 11,
          },
          tOut = {
            x: tp.x + SIDE_N[cand.t][0] * 11,
            y: tp.y + SIDE_N[cand.t][1] * 11,
          };
        const sc = cellOf(sOut),
          tc = cellOf(tOut);
        const allow = new Set([sc[1] * COLS + sc[0], tc[1] * COLS + tc[0]]);
        for (const n of [from, to]) {
          const c0 = Math.max(0, Math.floor((n.px! - n.w / 2 - 12) / CELL)),
            c1 = Math.min(COLS - 1, Math.floor((n.px! + n.w / 2 + 12) / CELL)),
            r0 = Math.max(0, Math.floor((n.py! - NH / 2 - 12) / CELL)),
            r1 = Math.min(ROWS - 1, Math.floor((n.py! + NH / 2 + 12) / CELL));
          for (let r = r0; r <= r1; r++)
            for (let c = c0; c <= c1; c++) allow.add(r * COLS + c);
        }
        const r = astar(sc, SIDE_D[cand.s], tc, allow);
        if (r && (!bestR || r.cost < bestR.cost))
          bestR = { ...r, sp, tp, s: cand.s, t: cand.t };
      }
      if (!bestR) return null;
      const B = bestR;
      // polyline from cells (compress), then attach the port stubs and keep everything orthogonal
      const pts = B.cells.map((cell) => ({
        x: (cell % COLS) * CELL + CELL / 2,
        y: ((cell / COLS) | 0) * CELL + CELL / 2,
      }));
      const C = [pts[0]];
      for (let i = 1; i < pts.length - 1; i++) {
        const a = C[C.length - 1],
          b = pts[i],
          c = pts[i + 1];
        if ((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y))
          continue;
        C.push({ ...b });
      }
      if (pts.length > 1) C.push({ ...pts[pts.length - 1] });
      const vert = (s: Side) => s === "top" || s === "bottom",
        n = C.length;
      const sp = B.sp,
        tp = B.tp;
      const s0 = { ...C[0] },
        e0 = { ...C[n - 1] };
      if (vert(B.s)) {
        s0.x = sp.x;
        if (n > 1 && C[1].x === C[0].x) C[1].x = sp.x;
      } else {
        s0.y = sp.y;
        if (n > 1 && C[1].y === C[0].y) C[1].y = sp.y;
      }
      if (vert(B.t)) {
        e0.x = tp.x;
        if (n > 1 && C[n - 2].x === C[n - 1].x) C[n - 2].x = tp.x;
      } else {
        e0.y = tp.y;
        if (n > 1 && C[n - 2].y === C[n - 1].y) C[n - 2].y = tp.y;
      }
      const raw =
        n === 1 ? [sp, s0, e0, tp] : [sp, s0, ...C.slice(1, -1), e0, tp];
      // orthogonalize: insert a corner wherever two consecutive points are diagonal (continue the previous direction)
      const Q = [raw[0]];
      for (let i = 1; i < raw.length; i++) {
        const a = Q[Q.length - 1],
          b = raw[i];
        if (a.x === b.x && a.y === b.y) continue;
        if (a.x !== b.x && a.y !== b.y) {
          const prev = Q.length > 1 ? Q[Q.length - 2] : null;
          const wasVert = prev ? prev.x === a.x : vert(B.s);
          Q.push(wasVert ? { x: a.x, y: b.y } : { x: b.x, y: a.y });
        }
        Q.push({ x: b.x, y: b.y });
      }
      // remove one-cell jogs in the interior (shift the short segment onto its neighbour)
      for (let i = 2; i < Q.length - 3; i++) {
        const a = Q[i],
          b = Q[i + 1],
          dx = b.x - a.x,
          dy = b.y - a.y;
        if (Math.hypot(dx, dy) < 9) {
          Q[i + 1] = { x: a.x, y: a.y };
          Q[i + 2] = { x: Q[i + 2].x - dx, y: Q[i + 2].y - dy };
        }
      }
      const F = [Q[0]];
      for (let i = 1; i < Q.length - 1; i++) {
        const a = F[F.length - 1],
          b = Q[i],
          c = Q[i + 1];
        if (
          (a.x === b.x && a.y === b.y) ||
          (a.x === b.x && b.x === c.x) ||
          (a.y === b.y && b.y === c.y)
        )
          continue;
        F.push(b);
      }
      F.push(Q[Q.length - 1]);
      B.cells.forEach((c) => {
        used[c] = Math.min(4, used[c] + 2);
        const cc = c % COLS,
          rr = (c / COLS) | 0;
        for (const [dx, dy] of DIRS) {
          const nc = cc + dx,
            nr = rr + dy;
          if (nc >= 0 && nr >= 0 && nc < COLS && nr < ROWS)
            used[nr * COLS + nc] = Math.min(4, used[nr * COLS + nc] + 1);
        }
      });
      return { pts: F, s: B.s, t: B.t };
    },
  };
}
export function portOf(n: Routable, side: Side): XY {
  const x = n.px ?? n.x!,
    y = n.py ?? n.y!;
  return side === "top"
    ? { x, y: y - NH / 2 }
    : side === "bottom"
      ? { x, y: y + NH / 2 }
      : side === "left"
        ? { x: x - n.w / 2, y }
        : { x: x + n.w / 2, y };
}
export function sideCandidates(a: XY, b: XY) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const sv: Side = dy < 0 ? "top" : "bottom",
    sh: Side = dx < 0 ? "left" : "right";
  const tv: Side = dy < 0 ? "bottom" : "top",
    th: Side = dx < 0 ? "right" : "left";
  const out: { s: Side; t: Side }[] = [{ s: sv, t: tv }];
  if (Math.abs(dx) > 30) {
    out.push({ s: sv, t: th });
    out.push({ s: sh, t: tv });
  }
  if (Math.abs(dy) > 60 && Math.abs(dx) > 120)
    out.push({ s: sv, t: tv === "bottom" ? "top" : "bottom" });
  return out;
}
export function roundedPath(P: XY[], r0 = 8) {
  if (P.length < 2) return "";
  let d = `M${P[0].x} ${P[0].y}`;
  for (let i = 1; i < P.length - 1; i++) {
    const a = P[i - 1],
      b = P[i],
      c = P[i + 1];
    const l1 = Math.hypot(b.x - a.x, b.y - a.y),
      l2 = Math.hypot(c.x - b.x, c.y - b.y);
    const r = Math.min(r0, l1 / 2, l2 / 2);
    const u1 = { x: (b.x - a.x) / (l1 || 1), y: (b.y - a.y) / (l1 || 1) },
      u2 = { x: (c.x - b.x) / (l2 || 1), y: (c.y - b.y) / (l2 || 1) };
    d += ` L${(b.x - u1.x * r).toFixed(1)} ${(b.y - u1.y * r).toFixed(1)} Q${b.x} ${b.y} ${(b.x + u2.x * r).toFixed(1)} ${(b.y + u2.y * r).toFixed(1)}`;
  }
  const e = P[P.length - 1];
  d += ` L${e.x} ${e.y}`;
  return d;
}
// cheap Z-route (used while a node is being dragged in the easter egg)
export function zRoute(a: Routable & XY, b: Routable & XY) {
  const sp = portOf(a, b.y < a.y ? "top" : "bottom"),
    tp = portOf(b, b.y < a.y ? "bottom" : "top");
  const my = (sp.y + tp.y) / 2;
  return [sp, { x: sp.x, y: my }, { x: tp.x, y: my }, tp];
}

/* =====================================================================
   Episode generator — seeded. Produces nodes, arrows and a declarative
   event list on a master clock (seconds at 1×). render(t) stays pure.
   ===================================================================== */
export interface Span {
  t0: number;
  t1: number;
}
type Cur = Pt3 & { dz?: number };
export interface SNode {
  id: string;
  label: string;
  layer: Layer;
  band: Band;
  slot?: number;
  icon?: IconKey;
  extra?: boolean;
  dupOf?: string;
  typed?: string;
  w: number;
  lx: number;
  ly: number;
  sLayer: Layer;
  slx: number;
  sly: number;
  cur: Cur;
  spans: [number, number][];
  types: { t0: number; t1: number; frames: string[]; edit?: number }[];
  moves: {
    t0: number;
    t1: number;
    from: Pt3;
    to: Pt3;
    lift: number;
    ease: Ease;
  }[];
  flags: {
    kind: "squig" | "badge" | "orphan" | "fail";
    t0: number;
    t1: number;
  }[];
  px?: number;
  py?: number;
  x?: number;
  y?: number;
  // DOM, set by the engine
  g: SVGGElement;
  inner: SVGGElement;
  text: SVGTextElement;
  textX: number;
  caret: SVGRectElement;
  squig: SVGPathElement;
  badge: SVGCircleElement;
  badgeRing: SVGCircleElement;
  shadow: SVGEllipseElement;
  host: Layer;
  cx: number | null;
  cy: number;
}
export interface Arrow {
  id: string;
  from: SNode;
  to: SNode;
  kind: "normal" | "bad" | "circ" | "circ2";
  riser?: boolean;
  anchor: Pt3;
  up: boolean;
  topLayer: Layer;
  bottomLayer: Layer;
  pts: XY[];
  layer: Layer;
  d: string;
  len: number;
  draw?: Span;
  bad?: Span;
  remove?: Span;
  morph?: Span;
  // DOM, set by the engine
  path: SVGPathElement;
  port0: SVGCircleElement;
  port1: SVGCircleElement;
  segs: SVGLineElement[];
  port: SVGCircleElement;
  head: SVGPolygonElement;
  land: SVGCircleElement;
  face: SVGPathElement;
  pulse: SVGCircleElement;
  faceD?: string;
  faceLen: number;
}
export interface Move {
  t0: number;
  t1: number;
  from?: Pt;
  to: Pt;
  c?: Pt;
  ease?: Ease;
  human?: boolean;
  arrow?: Arrow;
  follow?: SNode;
  dx?: number;
  dy?: number;
}
export interface Say {
  key: string;
  t0: number;
  t1: number;
}
export interface Actor {
  moves: Move[];
  clicks: { t: number; pt: Pt }[];
  says: Say[];
  pos0: Pt;
  flip: number;
  fade?: Span;
  rippleUntil?: number;
  sayState?: { say: Say; since: number | null; flipped: boolean | null };
}
export interface Commit {
  t: number;
  key: string;
  vars?: Record<string, string>;
}
export interface Chip {
  key: string;
  pt: Pt3;
  dx: number;
  dy: number;
  t0: number;
  t1: number;
}
export interface TermLine {
  t: number;
  key: string;
  c?: Commit;
  el: HTMLDivElement;
}
export type Episode = ReturnType<typeof buildEpisode>;

/**
 * @param textW   width of a label at the node font (the engine measures it; tests pass a stub)
 * @param last    the previous episode's errors, joined (avoided so two episodes in a row differ)
 */
export function buildEpisode(
  seed: number,
  index: number,
  isFinal: boolean,
  fbStart: Scr | null,
  textW: (s: string) => number,
  last: string,
) {
  const PR = drawParams(seed, last),
    R = PR.R;
  const domainKey = PR.domainKey,
    D = DOMAINS[domainKey];
  const errors = PR.errors;
  let micros = PR.micros;
  const mode = PR.mode;
  const has = (k: ErrorKey) => errors.includes(k);
  const hasM = (k: Micro) => micros.includes(k);
  const snake = (s: string) =>
    s.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
  const swapTypo = (s: string) => {
    const i = 2 + Math.floor(R.rng() * (s.length - 4));
    return s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2);
  };
  const nodeW = (n: SNode) =>
    Math.round(
      32 + Math.max(textW(n.label), textW(n.typed || "")) + (n.icon ? 30 : 0),
    );
  const routers: Partial<Record<Layer, ReturnType<typeof makeRouter>>> = {};

  /* ---- nodes ---- */
  const nodes = (
    [
      { id: "ent1", label: D.ent[0], layer: "en", band: "mid", slot: 0 },
      { id: "ent2", label: D.ent[1], layer: "en", band: "mid", slot: 1 },
      { id: "uc1", label: D.uc[0], layer: "uc", band: "top", slot: 0 },
      { id: "uc2", label: D.uc[1], layer: "uc", band: "bottom", slot: 0 },
      { id: "ctrl", label: D.ctrl, layer: "ia", band: "top", slot: 0 },
      { id: "repo", label: D.repo, layer: "ia", band: "bottom", slot: 0 },
      { id: "pres", label: D.pres, layer: "ia", band: "bottom", slot: 1 },
      {
        id: "web",
        label: "Web UI",
        icon: "next",
        layer: "fw",
        band: "top",
        slot: 0,
      },
      {
        id: "api",
        label: "REST API",
        icon: "fastapi",
        layer: "fw",
        band: "top",
        slot: 1,
      },
      {
        id: "db",
        label: "PostgreSQL",
        icon: "postgres",
        layer: "fw",
        band: "bottom",
        slot: 0,
      },
      {
        id: "cache",
        label: "Redis",
        icon: "redis",
        layer: "fw",
        band: "bottom",
        slot: 1,
      },
    ] as Partial<SNode>[]
  ).map((n) => n as SNode);
  const N: Record<string, SNode> = Object.fromEntries(
    nodes.map((n) => [n.id, n]),
  );
  // error → node assignment (disjoint where it matters)
  const E: Partial<Record<ErrorKey, string>> = {};
  if (has("wrongLayer")) E.wrongLayer = "repo";
  if (has("dup")) E.dup = E.wrongLayer ? "pres" : "repo";
  if (has("naming"))
    E.naming = ["repo", "pres", "ctrl"].find(
      (id) => id !== E.wrongLayer && id !== E.dup,
    );
  if (has("typo"))
    E.typo = R.pick(
      ["uc2", "ctrl", "uc1"].filter(
        (id) => id !== E.naming && !(id === "uc1" && has("failing")),
      ),
    );
  if (has("orphan")) E.orphan = E.dup === "pres" ? "cache" : "pres";
  if (has("failing")) E.failing = "uc1";
  if (has("dep") || E.orphan === "cache")
    micros = micros.filter((m) => m !== "marquee");
  if (E.typo) N[E.typo].typed = swapTypo(N[E.typo].label);
  if (E.naming) N[E.naming].typed = snake(N[E.naming].label);
  if (has("hal"))
    nodes.push({
      id: "hal",
      label: "left-pad-ai",
      layer: "fw",
      band: "top",
      extra: true,
    } as SNode);
  if (E.dup)
    nodes.push({
      id: "dup",
      label: N[E.dup].label,
      layer: "ia",
      band: "bottom",
      dupOf: E.dup,
      extra: true,
    } as SNode);
  nodes.forEach((n) => {
    N[n.id] = n;
    n.w = nodeW(n);
    n.spans = [];
    n.types = [];
    n.moves = [];
    n.flags = [];
  });
  // positions: plate-local (lx, ly) on the node's own plate
  for (const n of nodes) {
    const Pl = PLATES[n.layer];
    if (n.layer === "en") continue;
    n.ly = Pl.rows[n.band]!;
    if (n.extra) {
      n.lx = Pl.extra[n.band]![0];
      n.ly = Pl.extra[n.band]![1];
    } else n.lx = Pl.slots[n.band]![n.slot!];
  }
  {
    const a = N.ent1,
      b = N.ent2,
      total = a.w + 20 + b.w,
      cx = PLATES.en.w / 2;
    a.lx = cx - total / 2 + a.w / 2;
    b.lx = cx + total / 2 - b.w / 2;
    a.ly = b.ly = PLATES.en.rows.mid!;
  }
  if (N.dup) {
    N.dup.lx = N[E.dup!].lx + 24;
    N.dup.ly = N[E.dup!].ly + 18;
  }
  // start state (plate + position before the fixes / micro moves)
  nodes.forEach((n) => {
    n.sLayer = n.layer;
    n.slx = n.lx;
    n.sly = n.ly;
  });
  if (E.wrongLayer) {
    N.repo.sLayer = "uc";
    N.repo.slx = PLATES.uc.extra.top![0];
    N.repo.sly = PLATES.uc.extra.top![1];
  }
  const moved = new Set<string>();
  if (E.wrongLayer) moved.add("repo");
  if (hasM("marquee")) {
    ["db", "cache"].forEach((id) => {
      N[id].sly = N[id].ly + 12;
      moved.add(id);
    });
  }
  if (hasM("guides")) {
    N.ent2.slx = N.ent2.lx + 8;
    N.ent2.sly = N.ent2.ly + 6;
    moved.add("ent2");
  }
  nodes.forEach((n) => {
    n.cur = { layer: n.sLayer, lx: n.slx, ly: n.sly };
  }); // "current" during the build (cursor targets)

  /* ---- arrows (all point inward) ---- */
  const ARR = [
    ["web", "ctrl"],
    ["api", "ctrl"],
    ["ctrl", "uc1"],
    ["ctrl", "uc2"],
    ["uc1", "ent1"],
    ["uc2", "ent2"],
    ["pres", "uc2"],
    ["repo", "uc1"],
    ["db", "repo"],
    ["cache", "repo"],
  ];
  const arrows = ARR.map(
    ([f, t], i) =>
      ({ id: "a" + i, from: N[f], to: N[t], kind: "normal" }) as Arrow,
  );
  const AR: Record<string, Arrow> = Object.fromEntries(
    arrows.map((a) => [a.from.id + ">" + a.to.id, a]),
  );
  if (has("dep"))
    arrows.push({ id: "bad", from: N.ent1, to: N.db, kind: "bad" } as Arrow);
  if (has("circular")) {
    arrows.push({ id: "c1", from: N.uc1, to: N.uc2, kind: "circ" } as Arrow);
    arrows.push({ id: "c2", from: N.uc2, to: N.uc1, kind: "circ2" } as Arrow);
  }
  // cross-layer arrows are risers (vertical, anchored on the FRONT edge of the outer node); same-plate arrows are routed orthogonally on the face
  for (const a of arrows) {
    if (a.from.layer !== a.to.layer) {
      a.riser = true;
      const src = a.from; // the bad one hangs DOWN from the entity
      a.anchor = { layer: src.sLayer, lx: src.slx, ly: src.sly + NH / 2 - 6 }; // start plate of the source (the wrongLayer node's risers are drawn after it moved → fixed below)
      a.up = LI[a.to.layer] > LI[a.from.layer];
      a.topLayer = a.up ? a.to.layer : a.from.layer;
      a.bottomLayer = a.up ? a.from.layer : a.to.layer;
    } else {
      const layer = a.from.layer,
        Pl = PLATES[layer];
      const obstacles: Obstacles = nodes
        .filter(
          (n) => !n.extra && n.layer === layer && n !== a.from && n !== a.to,
        )
        .map((n) => ({ x: n.lx - n.w / 2, y: n.ly - NH / 2, w: n.w, h: NH }));
      obstacles.bounds = { x: 0, y: 0, w: Pl.w, h: Pl.h };
      if (!routers[layer]) routers[layer] = makeRouter(obstacles);
      nodes.forEach((n) => {
        n.px = n.lx;
        n.py = n.ly;
      });
      const r = routers[layer]!.route(
        a.from,
        a.to,
        sideCandidates(
          { x: a.from.lx, y: a.from.ly },
          { x: a.to.lx, y: a.to.ly },
        ),
      );
      a.pts = r ? r.pts : zRoute(a.from as SNode & XY, a.to as SNode & XY);
      a.layer = layer;
    }
  }
  // risers from nodes that move first (wrongLayer / marquee / guides) use the FINAL anchor — they are drawn after the move
  for (const a of arrows)
    if (a.riser && moved.has(a.from.id))
      a.anchor = {
        layer: a.from.layer,
        lx: a.from.lx,
        ly: a.from.ly + NH / 2 - 6,
      };

  /* ---- timeline ---- */
  const S = (sx: number, sy: number): Scr => ({ sx, sy });
  const ACT: Record<"ia" | "fb", Actor> = {
    ia: { moves: [], clicks: [], says: [], pos0: S(820, 60), flip: 1 },
    fb: {
      moves: [],
      clicks: [],
      says: [],
      pos0: fbStart || S(-80, 760),
      flip: -1,
    },
  };
  const ep = {
    seed,
    index,
    isFinal,
    domain: domainKey,
    errors,
    micros,
    mode,
    nodes,
    N,
    arrows,
    AR,
    chips: [] as Chip[],
    sels: [] as { node: SNode; t0: number; t1: number }[],
    toasts: [] as { t0: number; t1: number; c: Commit }[],
    termLines: [] as TermLine[],
    commits: [] as Commit[],
    acts: {} as Record<string, number>,
    wander: [] as { node: SNode; nudge: XY | null }[],
    actors: ACT,
    plates: [] as { layer: Layer; t0: number; t1: number }[],
    pin: null as null | { pt: Pt; t0: number; tRes: number; t1: number },
    marquee: null as null | {
      t0: number;
      t1: number;
      t2: number;
      x0: number;
      y0: number;
      x1: number;
      y1: number;
      layer: Layer;
    },
    guides: null as null | {
      t0: number;
      t1: number;
      layer: Layer;
      hx0: number;
      hx1: number;
      hy: number;
      vx: number;
      vy0: number;
      vy1: number;
    },
    tests: null as null | {
      mode: string;
      t0: number;
      t1: number;
      fail: { t: number } | null;
      rerun: Span | null;
    },
    term: null as null | Span,
    deployStart: 0,
    deployed: 0,
    MAIN: 0,
    idle: null as null | Span,
    collapse: null as null | Span,
    END: 0,
  };
  let now = 0;
  const act = (name: string) => {
    ep.acts[name] = now;
  };
  const pos = (k: "ia" | "fb") => {
    const m = ACT[k].moves;
    return m.length ? m[m.length - 1].to : ACT[k].pos0;
  };
  function ctrlFor(k: "ia" | "fb", from3: Pt, to3: Pt, bend?: number) {
    // control point in screen space (default view)
    const from = P(from3),
      to = P(to3);
    const a = ACT[k],
      dx = to.x - from.x,
      dy = to.y - from.y,
      len = Math.hypot(dx, dy) || 1;
    if (bend == null) {
      bend = len < 70 ? 0 : R.range(0.08, 0.2) * a.flip;
      a.flip *= -1;
    }
    return S(
      (from.x + to.x) / 2 + (dy / len) * bend * len,
      (from.y + to.y) / 2 - (dx / len) * bend * len,
    );
  }
  const off = (pt: Pt, dx: number, dy: number): Pt =>
    "sx" in pt
      ? S(pt.sx + dx, pt.sy + dy)
      : { ...pt, lx: pt.lx + dx, ly: pt.ly + dy };
  function moveTo(
    k: "ia" | "fb",
    to: Pt,
    dur: number,
    o: {
      c?: Pt;
      bend?: number;
      ease?: Ease;
      noHuman?: boolean;
      raw?: boolean;
    } = {},
  ) {
    const from = { ...pos(k) };
    dur = o.raw ? dur : R.J(dur);
    ACT[k].moves.push({
      t0: now,
      t1: now + dur,
      from,
      to,
      c: o.c || ctrlFor(k, from, to, o.bend),
      ease: o.ease || EASE_MOVE,
      human: !o.c && !o.noHuman,
    });
    now += dur;
    return to;
  }
  const wait = (d: number) => {
    now += R.J(d);
  };
  function click(k: "ia" | "fb", o: { pause?: number } = {}) {
    now += o.pause ?? R.range(0.05, 0.1);
    const p = pos(k);
    ACT[k].clicks.push({ t: now, pt: p });
    now += 0.07;
  }
  function say(k: "ia" | "fb", key: string, t0: number, t1: number) {
    ACT[k].says.push({ key, t0, t1 });
  }
  function typing(n: SNode, from: string, to: string, t0: number, cps: number) {
    let i = 0;
    while (i < from.length && i < to.length && from[i] === to[i]) i++;
    const frames: string[] = [];
    for (let k = from.length; k > i; k--) frames.push(from.slice(0, k - 1));
    for (let k = i + 1; k <= to.length; k++) frames.push(to.slice(0, k));
    if (!frames.length) frames.push(to);
    const dur = frames.length / cps;
    n.types.push({ t0, t1: t0 + dur, frames });
    return t0 + dur;
  }
  const nodeCursor = (n: SNode): Pt3 => ({
    layer: n.cur.layer,
    lx: n.cur.lx - n.w / 2 + 22,
    ly: n.cur.ly + 8,
  });
  function nodeIn(n: SNode, o: { typeDelete?: boolean } = {}) {
    n.spans.push([now, Infinity]);
    const target = n.typed || n.label;
    let tEnd;
    if (o.typeDelete) {
      // types, stumbles, deletes, retypes
      const k = 3 + Math.floor(R.rng() * 3),
        wrong = target.slice(0, k) + R.pick(["xz", "qw", "kk"]);
      const t1 = typing(n, "", wrong, now + 0.05, R.range(40, 50));
      tEnd = typing(n, wrong, target, t1 + 0.18, R.range(36, 46));
    } else tEnd = typing(n, "", target, now + 0.05, R.range(40, 52));
    return tEnd;
  }
  const drawT = (a: Arrow) => {
    if (a.riser) {
      a.len = Math.abs(LI[a.topLayer] - LI[a.bottomLayer]) * GAP * K;
      return clamp(0.26, 0.46, a.len / 700);
    }
    a.len = Math.max(
      60,
      a.pts.reduce(
        (s, p, i) =>
          i ? s + Math.hypot(p.x - a.pts[i - 1].x, p.y - a.pts[i - 1].y) : 0,
        0,
      ),
    );
    return clamp(0.2, 0.38, a.len / 600);
  };
  function drawArrow(
    k: "ia" | "fb",
    a: Arrow,
    o: { pre?: number; dur?: number } = {},
  ) {
    const start: Pt3 = a.riser
      ? { layer: a.anchor.layer, lx: a.anchor.lx, ly: a.anchor.ly }
      : { layer: a.layer, lx: a.pts[0].x, ly: a.pts[0].y };
    const end: Pt3 = a.riser
      ? {
          layer: a.anchor.layer,
          lx: a.anchor.lx,
          ly: a.anchor.ly,
          dz: (LI[a.to.layer] - LI[a.anchor.layer]) * GAP,
        }
      : {
          layer: a.layer,
          lx: a.pts[a.pts.length - 1].x,
          ly: a.pts[a.pts.length - 1].y,
        };
    moveTo(k, start, o.pre ?? 0.3);
    const dur = R.J(o.dur ?? drawT(a));
    a.draw = { t0: now, t1: now + dur };
    ACT[k].moves.push({
      t0: now,
      t1: now + dur,
      arrow: a,
      ease: EASE_IO,
      from: start,
      to: end,
    });
    now += dur;
    if (a.kind === "bad") a.bad = { t0: now + 0.05, t1: Infinity };
  }
  function removeArrow(a: Arrow, dur = 0.26) {
    a.remove = { t0: now, t1: now + dur };
    if (a.bad) a.bad.t1 = now;
    now += dur;
  }
  function chip(key: string, n: SNode, t0: number, t1: number, dx = 0, dy = 0) {
    ep.chips.push({
      key,
      pt: {
        layer: n.cur.layer,
        lx: n.cur.lx - n.w / 2 + 6,
        ly: n.cur.ly - NH / 2,
      },
      dx,
      dy: dy - 38,
      t0,
      t1,
    });
    return ep.chips[ep.chips.length - 1];
  }
  function commit(key: ErrorKey, vars?: Record<string, string>) {
    ep.commits.push({ t: now, key, vars });
  }
  function nodeMove(n: SNode, to: Pt3, dur: number) {
    // node is carried by the cursor; across plates it lifts in z (arc) and settles with a spring
    const from = { ...n.cur };
    n.moves.push({
      t0: now,
      t1: now + dur,
      from,
      to,
      lift: from.layer !== to.layer ? 70 : 0,
      ease: EASE_DRAG,
    });
    ACT.fb.moves.push({
      t0: now,
      t1: now + dur,
      follow: n,
      dx: 22 - n.w / 2,
      dy: 8,
      to: { layer: to.layer, lx: to.lx + 22 - n.w / 2, ly: to.ly + 8 },
    });
    now += dur;
    n.cur = { ...to };
  }
  const selOn = (n: SNode, t0: number, t1: number) =>
    ep.sels.push({ node: n, t0, t1 });

  /* ---- ACT 1 · entrance ---- */
  act("1 Entrada");
  ep.plates = LAYERS.map((l, i) => ({
    layer: l,
    t0: 0.05 + i * 0.22,
    t1: 0.05 + i * 0.22 + 0.7,
  })); // plates drop in bottom → top (episode 0) / reopen (later episodes)
  const SPOT = { fbIdle: S(70, 520), iaIdle: S(44, 190), fbTest: S(690, 690) };
  now = 0.5;
  moveTo("ia", S(600, 140), 1.0, { bend: 0.12 });
  now = 0.8;
  moveTo("fb", SPOT.fbIdle, 1.05, { bend: -0.12 });
  now = 1.7;

  /* ---- ACT 2 · IA scaffolds ---- */
  act("2 IA monta");
  const insideOut = R.chance(0.5);
  const layers: Layer[] = insideOut
    ? ["en", "uc", "ia", "fw"]
    : ["fw", "ia", "uc", "en"];
  const plain = nodes.filter((n) => !n.extra);
  const creation: SNode[] = [];
  for (const l of layers) {
    const group = R.shuffle(plain.filter((n) => n.layer === l));
    for (const n of group) {
      creation.push(n);
      if (n.id === E.dup) creation.push(N.dup);
      if (n.layer === "fw" && N.hal && n === group[group.length - 1])
        creation.push(N.hal);
    }
  }
  const undoNode = hasM("undo")
    ? R.pick(
        creation
          .filter((n) => !n.extra && !n.typed && n.id !== E.failing)
          .slice(1, -1),
      )
    : null;
  const typeDelNode = hasM("typeDelete")
    ? R.pick(creation.filter((n) => !n.extra && !n.typed && n !== undoNode))
    : null;
  const sameNode = hasM("sameNode")
    ? R.pick(
        creation
          .filter((n) => !n.extra && n !== undoNode && n !== typeDelNode)
          .slice(2, -1),
      )
    : null;
  say("ia", "scaffold", now, now + 2.4);
  say("fb", "watching", now + 0.8, now + 5.5);
  let saidRepo = false,
    saidWiring = false;
  for (const n of creation) {
    if (n.id === "repo" && !saidRepo) {
      saidRepo = true;
      say("ia", "repo", now, now + 1.4);
    }
    if (n.layer === "fw" && !saidWiring) {
      saidWiring = true;
      say("ia", "wiring", now, now + 1.5);
    }
    const c = nodeCursor(n);
    moveTo("ia", c, n.dupOf ? 0.16 : R.range(0.18, 0.26));
    click("ia");
    if (n.dupOf) {
      // ⌘V-ish paste: appears complete, no typing
      n.spans.push([now, Infinity]);
      n.types.push({ t0: now, t1: now + 0.01, frames: [n.label] });
      now += 0.22;
      continue;
    }
    const tEnd = nodeIn(n, { typeDelete: n === typeDelNode });
    now = tEnd + R.range(0.04, 0.1);
    if (n === undoNode) {
      say("ia", "undo", now, now + 0.6);
      now += 0.12;
      n.spans[0][1] = now;
      now += 0.42;
      n.spans.push([now, Infinity]);
      n.types.push({ t0: now, t1: now + 0.01, frames: [n.label] });
      now += 0.3;
    }
    if (n === sameNode) {
      // both cursors on the same node; IA yields
      const tf = now - 0.25;
      const save = now;
      now = tf;
      moveTo("fb", off(c, 30, 20), 0.5, { bend: 0.1 });
      const tArrive = now;
      now = Math.max(save, tArrive);
      say("ia", "yours", now, now + 0.9);
      say("fb", "goahead", now + 0.3, now + 1.1);
      moveTo("ia", off(c, 80, -60), 0.3, { bend: 0.15 });
      now += 0.25;
      const t2 = now;
      now = tArrive + 0.9;
      moveTo("fb", SPOT.fbIdle, 0.7, { bend: -0.1 });
      now = Math.max(now, t2);
    }
  }
  // arrows by IA
  const settled = (id: string) => !moved.has(id);
  const excluded = new Set<string>();
  if (E.orphan) excluded.add(E.orphan === "pres" ? "pres>uc2" : "cache>repo");
  if (has("dep")) excluded.add("db>repo");
  const normal = arrows.filter((a) => a.kind === "normal");
  const cand = R.shuffle(
    normal.filter(
      (a) =>
        settled(a.from.id) &&
        settled(a.to.id) &&
        !excluded.has(a.from.id + ">" + a.to.id),
    ),
  );
  const iaArrows = cand.slice(
    0,
    Math.min(cand.length, 5 + Math.floor(R.rng() * 2)),
  );
  const restArrows = R.shuffle(
    normal.filter(
      (a) => !iaArrows.includes(a) && !excluded.has(a.from.id + ">" + a.to.id),
    ),
  );
  say("ia", "connect", now, now + 2.4);
  const iaSeq = iaArrows.slice();
  const byId = (id: string) => arrows.find((a) => a.id === id)!;
  if (has("circular"))
    iaSeq.splice(
      1 + Math.floor(R.rng() * (iaSeq.length - 1)),
      0,
      byId("c1"),
      byId("c2"),
    );
  if (has("dep")) iaSeq.push(byId("bad"));
  iaSeq.forEach((a, i) =>
    drawArrow("ia", a, { pre: i ? R.range(0.12, 0.2) : 0.28 }),
  );
  if (has("circular")) {
    const c1 = byId("c1"),
      c2 = byId("c2");
    c1.bad = { t0: c2.draw!.t1 + 0.3, t1: Infinity };
    c2.bad = { t0: c2.draw!.t1 + 0.3, t1: Infinity };
  }
  const tIAdone = now;
  moveTo("ia", SPOT.iaIdle, 0.7, { bend: 0.1 });
  const tIAidle = now;

  /* ---- ACT 3 · the mistakes light up ---- */
  now = tIAdone;
  act("3 Erros");
  let tf = now + 0.1;
  const flag = (
    kind: SNode["flags"][number]["kind"],
    n: SNode,
    chipKey?: string,
  ) => {
    const f = { kind, t0: tf, t1: Infinity };
    n.flags.push(f);
    const c = chipKey ? chip(chipKey, n, tf, Infinity) : null;
    tf += 0.28;
    return { f, c };
  };
  const FL: Partial<
    Record<ErrorKey, { f?: SNode["flags"][number]; c: Chip | null }>
  > = {};
  if (has("dep")) {
    const a = byId("bad");
    FL.dep = {
      c: ep.chips[
        ep.chips.push({
          key: "dep",
          pt: { ...a.anchor, dz: (-(LI.en - LI.fw) * GAP) / 2 },
          dx: 14,
          dy: -10,
          t0: tf,
          t1: Infinity,
        }) - 1
      ],
    };
    tf += 0.28;
  }
  if (E.wrongLayer) FL.wrongLayer = flag("badge", N.repo, "wrongLayer");
  if (E.typo) FL.typo = flag("squig", N[E.typo]);
  if (E.naming) FL.naming = flag("squig", N[E.naming]);
  if (has("circular")) {
    FL.circular = { c: chip("circular", N.uc1, tf, Infinity, 20, 38) };
    tf += 0.28;
  }
  if (E.dup) FL.dup = flag("badge", N.dup);
  if (N.hal) FL.hal = flag("badge", N.hal, "hal");
  if (E.orphan) FL.orphan = flag("orphan", N[E.orphan], "orphan");
  say("fb", R.chance(0.5) ? "notright" : "close", now + 0.15, now + 1.5);
  // review hover: fb drifts to the first flagged thing
  const firstBad = E.wrongLayer
    ? N.repo
    : E.dup
      ? N.dup
      : N.hal
        ? N.hal
        : E.typo
          ? N[E.typo]
          : E.naming
            ? N[E.naming]
            : E.orphan
              ? N[E.orphan]
              : N.uc1;
  moveTo("fb", off(nodeCursor(firstBad), -30, 44), 0.85, { bend: 0.1 });
  if (hasM("pin")) {
    // comment pin on a quiet node
    const pn =
      R.pick(
        nodes.filter(
          (n) =>
            !n.extra &&
            !n.flags.length &&
            n.id !== E.failing &&
            n.id !== firstBad.id,
        ),
      ) || N.ctrl;
    const pp = {
      layer: pn.cur.layer,
      lx: pn.cur.lx + pn.w / 2 - 6,
      ly: pn.cur.ly - 18,
    };
    moveTo("fb", pp, 0.4);
    click("fb");
    ep.pin = { pt: off(pp, 12, -6), t0: now, tRes: Infinity, t1: Infinity };
    say("fb", "rename", now, now + 1.1);
    now += 0.35;
  }
  now = Math.max(now, tf) + 0.1;

  /* ---- ACT 4 · fixes ---- */
  act("4 Correções");
  const vars = (a: string, b?: string, l?: string) => ({
    a,
    b: b ?? "",
    l: l ?? "",
    n: a,
  });
  if (E.wrongLayer) {
    const n = N.repo;
    const c = nodeCursor(n);
    moveTo("fb", c, 0.36);
    say("fb", "wrong", now, now + 1.5);
    click("fb", { pause: 0.12 });
    const t0 = now,
      dur = R.J(0.95);
    selOn(n, t0 - 0.05, t0 + dur + 0.3);
    nodeMove(n, { layer: n.layer, lx: n.lx, ly: n.ly }, dur);
    FL.wrongLayer!.f!.t1 = t0 + dur * 0.8;
    FL.wrongLayer!.c!.t1 = t0 + 0.05;
    commit("wrongLayer", vars(n.label));
    wait(0.22);
  }
  if (E.dup) {
    const n = N.dup;
    const c = nodeCursor(n);
    moveTo("fb", off(c, 30, 0), 0.42);
    say("fb", "dup", now, now + 1.3);
    click("fb", { pause: 0.1 });
    selOn(n, now, now + 0.42);
    now += 0.34;
    n.spans[0][1] = now;
    FL.dup!.f!.t1 = now;
    say("ia", "mybad", now, now + 0.9);
    commit("dup", vars(n.label));
    wait(0.22);
  }
  if (N.hal) {
    const n = N.hal;
    const c = nodeCursor(n);
    moveTo("fb", off(c, 30, 0), 0.46, { bend: 0.12 });
    say("fb", "hal", now, now + 1.5);
    click("fb", { pause: 0.12 });
    selOn(n, now, now + 0.5);
    now += 0.42;
    n.spans[0][1] = now;
    FL.hal!.f!.t1 = now;
    FL.hal!.c!.t1 = now;
    say("ia", "oops", now, now + 0.9);
    commit("hal", {});
    wait(0.22);
  }
  if (has("dep")) {
    const a = byId("bad");
    const m = { ...a.anchor, dz: (-(LI.en - LI.fw) * GAP) / 2 };
    moveTo("fb", off(m, 6, 6), 0.42, { bend: -0.1 });
    say("fb", "fixdep", now, now + 1.6);
    click("fb", { pause: 0.12 });
    a.morph = { t0: now, t1: now + 0.55 };
    now += 0.6; // the head travels up the riser → inverted
    removeArrow(a);
    FL.dep!.c!.t1 = a.morph.t0;
    now += 0.12;
    drawArrow("fb", AR["db>repo"], { pre: 0.3 });
    commit("dep", {});
    say("ia", "fixed", now, now + 0.9);
    wait(0.2);
  }
  if (has("circular")) {
    const c2 = byId("c2"),
      c1 = byId("c1");
    const mp = c2.pts[Math.floor(c2.pts.length / 2)];
    const m = { layer: c2.layer, lx: mp.x, ly: mp.y };
    moveTo("fb", off(m, 4, 4), 0.44, { bend: 0.1 });
    say("fb", "circular", now, now + 1.4);
    click("fb", { pause: 0.12 });
    removeArrow(c2);
    c1.bad!.t1 = now;
    FL.circular!.c!.t1 = now;
    commit("circular", vars(N.uc2.label, N.uc1.label));
    wait(0.22);
  }
  if (E.orphan) {
    const n = N[E.orphan];
    const a = E.orphan === "pres" ? AR["pres>uc2"] : AR["cache>repo"];
    moveTo(
      "fb",
      { layer: n.cur.layer, lx: n.cur.lx + n.w / 2 - 10, ly: n.cur.ly + 4 },
      0.4,
    );
    say("fb", "orphan", now, now + 1.3);
    wait(0.2);
    drawArrow("fb", a, { pre: 0.28 });
    FL.orphan!.f!.t1 = a.draw!.t1;
    FL.orphan!.c!.t1 = a.draw!.t0;
    commit("orphan", vars(n.label, a.to.label));
    wait(0.2);
  }
  for (const kind of ["typo", "naming"] as const) {
    if (!E[kind]) continue;
    const n = N[E[kind]!];
    const c = nodeCursor(n);
    moveTo("fb", off(c, 8, 0), 0.44, { bend: 0.1 });
    say("fb", kind === "typo" ? "fixtypo" : "naming", now, now + 1.5);
    click("fb", { pause: 0.1 });
    now -= 0.06;
    click("fb", { pause: 0 });
    const tEnd = typing(n, n.typed!, n.label, now + 0.08, R.range(14, 18));
    FL[kind]!.f!.t1 = now + 0.08 + 0.3;
    commit(
      kind,
      vars(n.typed!, n.label, n.layer === "uc" ? "use-cases" : "adapters"),
    );
    now = tEnd + 0.25;
  }

  /* ---- ACT 5 · tidy, connect what's missing, test ---- */
  act("5 Conecta e testa");
  if (hasM("marquee")) {
    const a = N.db,
      b = N.cache;
    const x0 = Math.min(a.cur.lx - a.w / 2, b.cur.lx - b.w / 2) - 14,
      y0 = a.cur.ly - NH / 2 - 14,
      x1 = Math.max(a.cur.lx + a.w / 2, b.cur.lx + b.w / 2) + 14,
      y1 = a.cur.ly + NH / 2 + 14;
    moveTo("fb", { layer: "fw", lx: x0, ly: y0 }, 0.5, { bend: 0.1 });
    click("fb", { pause: 0.08 });
    const t0 = now,
      d1 = R.J(0.42);
    ep.marquee = { t0, t1: t0 + d1, t2: 0, x0, y0, x1, y1, layer: "fw" };
    moveTo("fb", { layer: "fw", lx: x1, ly: y1 }, d1, {
      ease: EASE_DRAG,
      bend: 0.03,
    });
    now += 0.12;
    say("fb", "group", now, now + 1.3);
    // grab the group and slide it back to its row
    const gx = (a.cur.lx + b.cur.lx) / 2,
      gy = a.cur.ly + 2;
    moveTo("fb", { layer: "fw", lx: gx, ly: gy }, 0.28);
    click("fb", { pause: 0.08 });
    const t1 = now,
      d2 = R.J(0.5);
    ep.marquee.t2 = t1 + d2 + 0.2;
    [a, b].forEach((n) => {
      n.moves.push({
        t0: t1,
        t1: t1 + d2,
        from: { ...n.cur },
        to: { layer: "fw", lx: n.lx, ly: n.ly },
        lift: 0,
        ease: EASE_DRAG,
      });
      n.cur = { layer: "fw", lx: n.lx, ly: n.ly };
    });
    ACT.fb.moves.push({
      t0: t1,
      t1: t1 + d2,
      follow: a,
      dx: gx - a.lx,
      dy: 2,
      to: { layer: "fw", lx: gx, ly: a.ly + 2 },
    });
    now += d2;
    selOn(a, t1 - 0.3, t1 + d2 + 0.25);
    selOn(b, t1 - 0.3, t1 + d2 + 0.25);
    wait(0.22);
  }
  if (hasM("guides")) {
    const n = N.ent2;
    const c = nodeCursor(n);
    moveTo("fb", c, 0.46, { bend: 0.1 });
    say("fb", "align", now, now + 1.2);
    click("fb", { pause: 0.1 });
    const t0 = now,
      d = R.J(0.5);
    selOn(n, t0 - 0.05, t0 + d + 0.35);
    nodeMove(n, { layer: "en", lx: n.lx, ly: n.ly }, d);
    ep.guides = {
      t0: t0 + d * 0.55,
      t1: t0 + d + 0.4,
      layer: "en",
      hx0: 8,
      hx1: PLATES.en.w - 8,
      hy: n.ly,
      vx: n.lx,
      vy0: 8,
      vy1: PLATES.en.h - 8,
    };
    wait(0.22);
  }
  if (ep.pin) {
    moveTo("fb", off(ep.pin.pt, -2, 10), 0.42, { bend: 0.1 });
    click("fb", { pause: 0.08 });
    ep.pin.tRes = now;
    ep.pin.t1 = now + 0.9;
    say("fb", "resolved", now, now + 0.9);
    wait(0.22);
  }
  say("fb", "missing", now, now + Math.max(1.2, restArrows.length * 0.62));
  restArrows.forEach((a, i) =>
    drawArrow("fb", a, { pre: i ? R.range(0.18, 0.26) : 0.34 }),
  );
  moveTo("fb", SPOT.fbTest, 0.5, { bend: -0.1 });
  // tests
  const T = (ep.tests = {
    mode,
    t0: now,
    t1: now + R.J(1.1),
    fail: null as { t: number } | null,
    rerun: null as Span | null,
  });
  if (mode === "B") {
    ep.term = { t0: now - 0.1, t1: Infinity };
    ep.commits.forEach((c, i) =>
      ep.termLines.push({
        t: now + 0.08 + i * 0.1,
        key: "commit",
        c,
      } as TermLine),
    );
    T.t0 = now + 0.2 + ep.commits.length * 0.1;
    T.t1 = T.t0 + R.J(1.1);
    ep.termLines.push({ t: T.t0, key: "tests" } as TermLine);
  }
  say("fb", "tests", T.t0, T.t1);
  now = T.t1;
  if (E.failing) {
    T.fail = { t: T.t1 };
    say("fb", "testsFail", now, now + 1.0);
    const n = N.uc1;
    n.flags.push({ kind: "fail", t0: now + 0.05, t1: Infinity });
    const ch = chip("fail", n, now + 0.1, Infinity);
    if (mode === "B") ep.termLines.push({ t: now, key: "fail" } as TermLine);
    now += 0.5;
    const c = nodeCursor(n);
    moveTo("fb", off(c, 20, 0), 0.5, { bend: 0.1 });
    say("fb", "failing", now, now + 1.3);
    click("fb", { pause: 0.1 });
    now -= 0.06;
    click("fb", { pause: 0 });
    n.types.push({
      t0: now + 0.05,
      t1: now + 0.06,
      frames: [n.label],
      edit: now + 0.7,
    });
    now += 0.75;
    n.flags[n.flags.length - 1].t1 = now;
    ch.t1 = now;
    commit("failing", vars(n.label));
    moveTo("fb", SPOT.fbTest, 0.45, { bend: -0.1 });
    T.rerun = { t0: now, t1: now + R.J(0.8) };
    if (mode === "B") {
      ep.termLines.push({
        t: now - 0.05,
        key: "commit",
        c: ep.commits[ep.commits.length - 1],
      } as TermLine);
      ep.termLines.push({ t: now, key: "rerun" } as TermLine);
    }
    say("fb", "tests", now, T.rerun.t1);
    now = T.rerun.t1;
  }
  say("fb", "testsOk", now, now + 0.9);
  if (mode === "B") ep.termLines.push({ t: now, key: "pass" } as TermLine);
  now += 0.95;

  /* ---- ACT 6 · approve, ship, deployed ---- */
  act("6 Aprova");
  say("fb", "lgtm", now, now + 0.6);
  now += 0.62;
  say("fb", "ship", now, now + 1.3);
  now = Math.max(now, tIAidle);
  const tDeployStart = now + 0.1;
  say("ia", "deploying", tDeployStart, tDeployStart + 0.9);
  ep.deployStart = tDeployStart;
  ep.deployed = tDeployStart + 0.9;
  if (mode === "B") {
    ep.termLines.push({ t: ep.deployed, key: "deploy" } as TermLine);
    ep.term!.t1 = ep.deployed + 1.3;
  }
  say("ia", "thumbs", ep.deployed + 0.05, ep.deployed + 0.9);
  ACT.ia.fade = { t0: ep.deployed + 0.6, t1: ep.deployed + 1.1 };
  moveTo("fb", SPOT.fbTest, 0.9, { bend: 0.08 });
  now = Math.max(now, ep.deployed + 1.15);
  ep.MAIN = now;

  /* ---- idle life (wander) + collapse ---- */
  act("7 Vida mínima");
  ep.idle = { t0: now + 1.4, t1: now + 13.4 }; // breathing first, then the wander
  const wanderPool = R.shuffle(nodes.filter((n) => !n.extra));
  for (let i = 0; i < 10; i++) {
    const n = wanderPool[i % wanderPool.length];
    ep.wander.push({
      node: n,
      nudge: R.chance(0.3) ? { x: R.pick([-1, 1]), y: R.pick([0, 1]) } : null,
    });
  }
  if (!isFinal) {
    act("8 Recolhe");
    ep.collapse = { t0: ep.idle.t1, t1: ep.idle.t1 + 1.15 };
    ep.END = ep.collapse.t1 + 1.6;
  } // 1.6 s of empty canvas before the next episode
  else ep.END = ep.idle.t1;
  // toasts (mode C)
  if (mode === "C")
    ep.commits.forEach((c) => ep.toasts.push({ t0: c.t, t1: c.t + 2.2, c }));
  // index
  ep.chips.forEach((c) => {
    if (c.t1 === Infinity) c.t1 = ep.MAIN;
  });
  nodes.forEach((n) => {
    n.flags.forEach((f) => {
      if (f.t1 === Infinity) f.t1 = ep.MAIN;
    });
  });
  arrows.forEach((a) => {
    if (!a.riser) a.d = roundedPath(a.pts);
  });
  return ep;
}
