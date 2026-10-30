/* Hero scene easter egg (own chunk, loaded on the first pointer over the scene): during the idle
   life the visitor can drag nodes. A good drop stays; a wrong one waits where it fell and Felipebc2
   carries it back, one by one. More than 3 and he drags the visitor's cursor out first. */
import { clamp } from "motion";
import {
  K,
  LAYERS,
  lerp,
  NH,
  P,
  PLATES,
  roundedPath,
  routeOnPlate,
  STAGE_W,
  STAGE_H,
  toLocal,
  type SNode,
  type XY,
} from "./core";
import type { EggApi, EggCtx } from "./engine";

/** marks the eggs chunk for the e2e */
export const EGGS_ID = "fbc2-hero-eggs";

export function install(ctx: EggCtx): EggApi {
  const { egg, scene, signal, ui } = ctx;
  scene.dataset.eggs = EGGS_ID;
  const opts = { signal };

  // top plate first
  function hitNode(p: XY) {
    const ep = ctx.ep();
    for (const layer of LAYERS.slice().reverse()) {
      const l = toLocal(layer, p.x, p.y);
      for (let i = ep.nodes.length - 1; i >= 0; i--) {
        const n = ep.nodes[i];
        if (
          n.extra ||
          n.cx == null ||
          n.cur.layer !== layer ||
          n.g.style.display === "none" ||
          egg.hold[n.id] ||
          (egg.back && egg.back.n === n)
        )
          continue;
        if (
          Math.abs(l.lx - (n.cur.lx + (n.cur.dz || 0))) <= n.w / 2 &&
          Math.abs(l.ly - (n.cur.ly - (n.cur.dz || 0))) <= NH / 2
        )
          return n;
      }
    }
    return null;
  }
  function plateAt(p: XY) {
    for (const layer of LAYERS.slice().reverse()) {
      const Pl = PLATES[layer],
        l = toLocal(layer, p.x, p.y);
      if (l.lx >= 0 && l.lx <= Pl.w && l.ly >= 0 && l.ly <= Pl.h) return layer;
    }
    return null;
  }
  scene.addEventListener(
    "pointerdown",
    (e) => {
      if (
        ctx.isStatic() ||
        ctx.phase() !== "idle" ||
        e.button !== 0 ||
        egg.banned
      )
        return;
      const p = ctx.toStage(e),
        n = hitNode(p);
      if (!n) return;
      e.preventDefault();
      const l = toLocal(n.cur.layer, p.x, p.y);
      egg.drag = {
        n,
        dx: l.lx - n.cur.lx,
        dy: l.ly - n.cur.ly,
        at: { layer: n.cur.layer, lx: n.cur.lx, ly: n.cur.ly },
      };
      egg.busy = true;
      egg.hover = null;
      if (!ctx.hasMaster()) ctx.startTicker(); // Felipebc2 keeps wandering while the visitor holds a node; the master only holds at the end of the idle life
      try {
        scene.setPointerCapture(e.pointerId);
      } catch {}
    },
    opts,
  );
  scene.addEventListener(
    "pointerup",
    (e) => {
      if (egg.drag) endDrag(ctx.toStage(e));
    },
    opts,
  );
  scene.addEventListener(
    "pointercancel",
    () => egg.drag && endDrag(null),
    opts,
  );
  window.addEventListener("blur", () => egg.drag && endDrag(null), opts);

  // same-plate arrows only (risers follow the node on their own)
  function rerouteFor(node: SNode) {
    const ep = ctx.ep();
    for (const a of ep.arrows) {
      if (a.riser || !(a.from === node || a.to === node) || a.remove || !a.draw)
        continue;
      a.pts = routeOnPlate(
        a,
        a.layer,
        ep.nodes,
        (n) => n.g.style.display !== "none",
      );
      a.d = roundedPath(a.pts);
      ctx.setAttr(a.path, "d", a.d);
      a.len = a.path.getTotalLength();
      ctx.setAttr(a.path, "stroke-dasharray", a.len);
      ctx.setAttr(a.port0, "cx", a.pts[0].x);
      ctx.setAttr(a.port0, "cy", a.pts[0].y);
      ctx.setAttr(a.port1, "cx", a.pts[a.pts.length - 1].x);
      ctx.setAttr(a.port1, "cy", a.pts[a.pts.length - 1].y);
    }
  }
  function endDrag(p: XY | null) {
    const ep = ctx.ep();
    const d = egg.drag!;
    egg.drag = null;
    if (!p) {
      ctx.settle();
      return;
    } // pointer left the scene: back to its place, no comment
    const drop = { ...d.at },
      Pl = PLATES[drop.layer];
    const inside =
      drop.lx - d.n.w / 2 >= 0 &&
      drop.lx + d.n.w / 2 <= Pl.w &&
      drop.ly - NH / 2 >= 0 &&
      drop.ly + NH / 2 <= Pl.h;
    const ok =
      drop.layer === d.n.layer &&
      inside &&
      !ep.nodes.some(
        (o) =>
          o !== d.n &&
          !o.extra &&
          o.cx != null &&
          o.cur.layer === drop.layer &&
          Math.abs(o.cur.lx - drop.lx) < (o.w + d.n.w) / 2 + 10 &&
          Math.abs(o.cur.ly - drop.ly) < NH + 10,
      );
    if (ok) {
      // keep it there: settle with a spring, commit the position, re-route same-plate arrows
      d.n.lx = d.n.slx = drop.lx;
      d.n.ly = d.n.sly = drop.ly;
      d.n.sLayer = d.n.layer;
      d.n.moves = [];
      d.n.cur = { ...drop, dz: 24 };
      egg.settle = { n: d.n, p: 0 };
      ctx.anim(0, 1, {
        type: "spring",
        stiffness: 600,
        damping: 16,
        onUpdate: (v: number) => {
          if (egg.settle) egg.settle.p = v;
        },
        onComplete: () => {
          egg.settle = null;
        },
      });
      rerouteFor(d.n);
      if (!egg.fixing) ctx.eggSay("nice", 1.3);
      ctx.settle();
      return;
    }
    // wrong layer / outside / on top of another node: it waits where it was dropped, Felipebc2 will come for it
    egg.hold[d.n.id] = drop;
    egg.queue.push(d.n);
    egg.messed++;
    if (egg.messed > 3 && !egg.banned) egg.banned = true; // Felipebc2 will come for the visitor's cursor before fixing the rest
    if (!egg.fixing) processQueue();
  }
  // Felipebc2's cursor walks to `to` (fading in), from where it is (or `fallback`)
  function walkFb(fallback: XY, to: XY, duration: number, done: () => void) {
    const from = egg.fb
      ? { x: egg.fb.x, y: egg.fb.y }
      : ui.fbPos()
        ? { ...ui.fbPos()! }
        : fallback;
    if (!egg.fb) egg.fb = { x: from.x, y: from.y, w: 0 };
    const w0 = egg.fb.w;
    ctx.anim(0, 1, {
      duration,
      ease: [0.3, 0, 0.1, 1],
      onUpdate: (v: number) => {
        if (!egg.fb) return;
        egg.fb.w = lerp(w0, 1, v);
        egg.fb.x = lerp(from.x, to.x, v);
        egg.fb.y = lerp(from.y, to.y, v);
      },
      onComplete: done,
    });
  }
  // ">:(" → walk to the You cursor → grab it (selection handles) → drag it out of the scene with acceleration
  function throwOutCursor(done: () => void) {
    egg.saidAngry = true;
    ctx.eggSay("angry", 1.6);
    const you = {
      x: clamp(0, STAGE_W, egg.you.x),
      y: clamp(0, STAGE_H, egg.you.y),
    };
    walkFb({ x: 660, y: 760 }, { x: you.x + 9, y: you.y + 12 }, 0.55, () => {
      egg.grab = { x: you.x, y: you.y };
      ctx.later(() => {
        const exit = {
          x: you.x < STAGE_W / 2 ? -140 : STAGE_W + 140,
          y: you.y,
        };
        ctx.anim(0, 1, {
          duration: 0.9,
          ease: [0.7, 0, 1, 0.6],
          onUpdate: (v: number) => {
            if (!egg.grab || !egg.fb) return;
            egg.grab.x = lerp(you.x, exit.x, v);
            egg.grab.y = lerp(you.y, exit.y, v);
            egg.fb.x = egg.grab.x + 9;
            egg.fb.y = egg.grab.y + 12;
          },
          onComplete: () => {
            egg.grab = null;
            ui.youEl.style.opacity = "0";
            ctx.anim(0, 1, {
              duration: 0.5,
              ease: [0.3, 0, 0.1, 1],
              onUpdate: (v: number) => {
                if (!egg.fb) return;
                egg.fb.x = lerp(exit.x + 9, 660, v);
                egg.fb.y = lerp(exit.y + 12, Math.min(exit.y, 700), v);
              },
              onComplete: () => {
                egg.banTimer = ctx.later(ctx.liftBan, 7000);
                done();
              },
            });
          },
        });
      }, 420);
    });
  }
  function processQueue() {
    if (egg.banned && !egg.saidAngry) {
      egg.fixing = true;
      throwOutCursor(processQueue);
      return;
    }
    const n = egg.queue.shift();
    if (!n) {
      egg.fixing = false;
      ctx.anim(1, 0, {
        duration: 0.6,
        ease: "easeInOut",
        onUpdate: (v: number) => {
          if (egg.fb) egg.fb.w = v;
        },
        onComplete: () => {
          egg.fb = null;
          ctx.settle();
        },
      });
      return;
    }
    egg.fixing = true;
    const drop = egg.hold[n.id];
    walkFb(
      { x: 690, y: 690 },
      P({ layer: drop.layer, lx: drop.lx - n.w / 2 + 22, ly: drop.ly + 8 }),
      0.45,
      () => {
        ctx.eggSay(egg.banned ? "enough" : "nope", 1.4);
        // lift it off the wrong plate, carry it in an arc, drop it on the right one, settle
        ctx.later(() => {
          egg.back = {
            n,
            from: { ...drop },
            to: { layer: n.layer, lx: n.lx, ly: n.ly },
            p: 0,
            settle: null,
          };
          delete egg.hold[n.id];
          ctx.anim(0, 1, {
            duration: 0.85,
            ease: [0.5, 0, 0.2, 1],
            onUpdate: (v: number) => {
              if (egg.back && egg.fb) {
                egg.back.p = v;
                const b = egg.back,
                  A = P(b.from),
                  B = P(b.to);
                egg.fb.x = lerp(A.x, B.x, v) + 12;
                egg.fb.y =
                  lerp(A.y, B.y, v) - 60 * Math.sin(Math.PI * v) * K + 10;
              }
            },
            onComplete: () => {
              ctx.anim(0, 1, {
                type: "spring",
                stiffness: 600,
                damping: 16,
                onUpdate: (v: number) => {
                  if (egg.back) egg.back.settle = v;
                },
                onComplete: () => {
                  egg.back = null;
                  processQueue();
                },
              });
            },
          });
        }, 300);
      },
    );
  }

  return {
    move(p) {
      const ep = ctx.ep();
      if (egg.drag) {
        const layer = plateAt(p) || egg.drag.at.layer || egg.drag.n.cur.layer;
        const l = toLocal(layer, p.x, p.y);
        egg.drag.at = { layer, lx: l.lx - egg.drag.dx, ly: l.ly - egg.drag.dy };
        return;
      }
      egg.hover = ep && ctx.phase() === "idle" && !egg.busy ? hitNode(p) : null;
    },
    leave() {
      if (egg.drag) endDrag(null);
    },
  };
}
