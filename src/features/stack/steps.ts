/** a step is reached within this many px; absorbs sub-pixel scroll and inertia rounding */
const TOL = 2;

/**
 * Where a scroll heading from `from` to `to` must stop instead, given the step positions
 * (ascending). Crossing a step from outside stops on it; leaving the gap between two steps
 * goes to the step in that direction, except that the first gap only pulls once the
 * scroll has gone `pull` px past the first step. null = scroll freely.
 */
export function nextStep(
  from: number,
  to: number,
  steps: readonly number[],
  pull = 0,
) {
  if (to > from) {
    const ahead = steps.find((p) => p > from + TOL);
    if (ahead === undefined) return null;
    const behind = steps.findLast((p) => p <= from + TOL);
    const lead = behind === steps[0] ? steps[0] + pull : behind;
    return to > (lead === undefined ? ahead : Math.max(from, lead)) + TOL
      ? ahead
      : null;
  }
  if (to < from) {
    const ahead = steps.findLast((p) => p < from - TOL);
    if (ahead === undefined) return null;
    const behind = steps.find((p) => p >= from - TOL);
    return to < (behind === undefined ? ahead : Math.min(from, behind)) - TOL
      ? ahead
      : null;
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

/** Stopping inside a gap between steps (past the first one's `pull`) leaves the story half-way: the nearest step, else null. */
export function inGap(at: number, steps: readonly number[], pull = 0) {
  const i = steps.findIndex((p) => p > at);
  if (i < 1 || at < steps[0] + pull) return null;
  const a = steps[i - 1],
    b = steps[i];
  if (at <= a + TOL || at >= b - TOL) return null;
  return at - a < b - at ? a : b;
}
