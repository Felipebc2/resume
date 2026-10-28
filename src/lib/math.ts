export const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, v));
export const ease = (t: number) => t * t * (3 - 2 * t);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
