/** 5×7 glyphs for the coarse (phone) grid */
const FONT5: Record<string, string[]> = {
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  2: [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
};
/** 7×10 glyphs, 1-cell strokes, for the finer desktop grid */
const FONT7: Record<string, string[]> = {
  F: [
    "#######",
    "#......",
    "#......",
    "#......",
    "######.",
    "#......",
    "#......",
    "#......",
    "#......",
    "#......",
  ],
  E: [
    "#######",
    "#......",
    "#......",
    "#......",
    "######.",
    "#......",
    "#......",
    "#......",
    "#......",
    "#######",
  ],
  L: [
    "#......",
    "#......",
    "#......",
    "#......",
    "#......",
    "#......",
    "#......",
    "#......",
    "#......",
    "#######",
  ],
  I: [
    "#######",
    "...#...",
    "...#...",
    "...#...",
    "...#...",
    "...#...",
    "...#...",
    "...#...",
    "...#...",
    "#######",
  ],
  P: [
    "######.",
    "#.....#",
    "#.....#",
    "#.....#",
    "######.",
    "#......",
    "#......",
    "#......",
    "#......",
    "#......",
  ],
  B: [
    "######.",
    "#.....#",
    "#.....#",
    "#.....#",
    "######.",
    "#.....#",
    "#.....#",
    "#.....#",
    "#.....#",
    "######.",
  ],
  C: [
    ".######",
    "#......",
    "#......",
    "#......",
    "#......",
    "#......",
    "#......",
    "#......",
    "#......",
    ".######",
  ],
  2: [
    ".#####.",
    "#.....#",
    "......#",
    "......#",
    ".....#.",
    "....#..",
    "...#...",
    "..#....",
    ".#.....",
    "#######",
  ],
};

/** coarse: phones. fine: desktop, same card height with ~1.5× the cells per side */
export const GRIDS = {
  coarse: { cols: 59, rows: 11, font: FONT5, x0: 3, y0: 2, step: 6 },
  fine: { cols: 88, rows: 16, font: FONT7, x0: 4, y0: 3, step: 9 },
} as const;
export type GridKind = keyof typeof GRIDS;

/**
 * A fake contribution graph that spells a word.
 * `level` is each cell's final shade (0–4); `key` is when it lights up during the
 * 0→1 draw, so letters sweep left to right while the noise fills in at random.
 * The fine grid's noise is quieter, so the 1-cell strokes stay readable.
 */
export function buildGrid(kind: GridKind = "coarse") {
  const { cols, rows, font, x0, y0, step } = GRIDS[kind];
  const n = cols * rows;
  const level = new Uint8Array(n);
  const key = new Float32Array(n);
  const letter = new Uint8Array(n);
  [..."FELIPEBC2"].forEach((ch, li) =>
    font[ch].forEach((row, y) =>
      [...row].forEach((v, x) => {
        if (v === "#") letter[(y0 + y) * cols + x0 + li * step + x] = 1;
      }),
    ),
  );
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const [z, a, b] = kind === "coarse" ? [0.68, 0.87, 0.97] : [0.72, 0.9, 0.985];
  const dim = kind === "coarse" ? 0.12 : 0.06; // letter cells a shade down, for texture
  for (let i = 0; i < n; i++) {
    if (letter[i]) {
      level[i] = rnd() < dim ? 3 : 4;
      key[i] = 0.08 + 0.84 * ((i % cols) / cols) + rnd() * 0.04;
    } else {
      const r = rnd();
      level[i] = r < z ? 0 : r < a ? 1 : r < b ? 2 : 3;
      key[i] = rnd();
    }
  }
  return { level, key, letter, cols, rows };
}

/** A cell's shade while it twinkles: noise steps one level, letters dim a shade. */
export const twinkle = (g: ReturnType<typeof buildGrid>, i: number) =>
  g.letter[i] ? 3 : g.level[i] < 2 ? g.level[i] + 1 : g.level[i] - 1;

/** Shade of every cell at draw progress `d` (0–1). */
export const levelsAt = (
  { level, key }: ReturnType<typeof buildGrid>,
  d: number,
) => Array.from(level, (lv, i) => (key[i] <= d ? lv : 0));
