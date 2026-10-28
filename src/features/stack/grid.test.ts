import { expect, test } from "vitest";
import { buildGrid, levelsAt, twinkle } from "./grid";

const COLS = 59,
  ROWS = 11;

test("letter cells are bright and the grid is deterministic", () => {
  const g = buildGrid();
  expect(g.level).toHaveLength(COLS * ROWS);
  const letters = g.letter.reduce((a, v) => a + v, 0);
  expect(letters).toBe(138);
  g.letter.forEach((v, i) => v && expect(g.level[i]).toBeGreaterThanOrEqual(3));
  expect(buildGrid().level).toEqual(g.level);
});

test("the fine grid spells the word with 1-cell strokes inside its frame", () => {
  const f = buildGrid("fine");
  expect(f.level).toHaveLength(88 * 16);
  const at = (i: number) => [i % f.cols, Math.floor(i / f.cols)];
  f.letter.forEach((v, i) => {
    if (!v) return;
    expect(f.level[i]).toBeGreaterThanOrEqual(3);
    const [x, y] = at(i);
    expect(x).toBeGreaterThanOrEqual(4);
    expect(x).toBeLessThan(84);
    expect(y).toBeGreaterThanOrEqual(3);
    expect(y).toBeLessThan(13);
  });
});

test("a twinkle is always a nearby shade, never off-scale", () => {
  const g = buildGrid("fine");
  for (let i = 0; i < g.level.length; i++) {
    const t = twinkle(g, i);
    expect(t).toBeGreaterThanOrEqual(1);
    expect(t).toBeLessThanOrEqual(3);
    expect(Math.abs(t - g.level[i])).toBeLessThanOrEqual(1);
  }
});

test("draw progress goes from blank to the full graph", () => {
  const g = buildGrid();
  expect(levelsAt(g, 0).every((v) => v === 0)).toBe(true);
  expect(levelsAt(g, 1)).toEqual(Array.from(g.level));
});
