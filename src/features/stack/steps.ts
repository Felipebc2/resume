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
