import { expect, test } from "vitest";
import { buildGrid, COLS, levelsAt, ROWS } from "./grid";

test("letter cells are bright and the grid is deterministic", () => {
  const g = buildGrid();
  expect(g.level).toHaveLength(COLS * ROWS);
  const letters = g.letter.reduce((a, v) => a + v, 0);
  expect(letters).toBe(138);
  g.letter.forEach((v, i) => v && expect(g.level[i]).toBeGreaterThanOrEqual(3));
  expect(buildGrid().level).toEqual(g.level);
});

test("draw progress goes from blank to the full graph", () => {
  const g = buildGrid();
  expect(levelsAt(g, 0).every((v) => v === 0)).toBe(true);
  expect(levelsAt(g, 1)).toEqual(Array.from(g.level));
});
