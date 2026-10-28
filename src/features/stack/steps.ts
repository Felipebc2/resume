/** a step is reached within this many px; absorbs sub-pixel scroll and inertia rounding */
const TOL = 2;

/**
 * Where a scroll heading from `from` to `to` must stop instead, given the two step
 * positions p0 (greeting) < p1 (stack). Crossing a step from outside stops on it;
 * leaving the gap between them goes to the step in that direction. null = scroll freely.
 */
export function nextStep(from: number, to: number, p0: number, p1: number) {
  if (to > from) {
    if (from < p0 - TOL && to > p0 + TOL) return p0;
    if (from >= p0 - TOL && from < p1 - TOL && to > Math.max(from, p0) + TOL)
      return p1;
  } else if (to < from) {
    if (from > p1 + TOL && to < p1 - TOL) return p1;
    if (from <= p1 + TOL && from > p0 + TOL && to < Math.min(from, p1) - TOL)
      return p0;
  }
  return null;
}

/** Input after landing on a step that adds up past this, in one direction, means "keep going";
    a trackpad's momentum tail is far smaller by then. */
export const PASS_PX = 150;

export type Push = { dir: number; px: number };

/** Accumulates post-landing input per direction; `pass` once it reads as a person still scrolling. */
export function push(prev: Push, deltaY: number) {
  const dir = Math.sign(deltaY);
  const px = dir === prev.dir ? prev.px + Math.abs(deltaY) : Math.abs(deltaY);
  return { dir, px, pass: px > PASS_PX };
}

/** Stopping inside the gap between the steps leaves the story half-way: the nearest step, else null. */
export function inGap(at: number, p0: number, p1: number) {
  if (at <= p0 + TOL || at >= p1 - TOL) return null;
  return at - p0 < p1 - at ? p0 : p1;
}
