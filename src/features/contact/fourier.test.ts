import { expect, test } from "vitest";
import { epicycles, tip } from "./fourier";

test("every term together redraws the sampled signature", () => {
  const sig = {
    aspect: 1,
    strokes: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
      ],
      [
        [0, 1],
        [0.5, 0.5],
      ],
    ] as [number, number][][],
  };
  const { terms, pts, jumps, N } = epicycles(sig, 40);
  expect(jumps.size).toBeGreaterThan(0);
  for (const k of [0, 7, 23, 39]) {
    const [x, y] = tip(terms, terms.length, k, N);
    expect(x).toBeCloseTo(pts[k][0], 9);
    expect(y).toBeCloseTo(pts[k][1], 9);
  }
});
