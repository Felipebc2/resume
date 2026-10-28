const FONT: Record<string, string[]> = {
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  2: [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
};

export const COLS = 59;
export const ROWS = 11;

/**
 * A fake contribution graph that spells a word.
 * `level` is each cell's final shade (0–4); `key` is when it lights up during the
 * 0→1 draw, so letters sweep left to right while the noise fills in at random.
 */
export function buildGrid() {
  const n = COLS * ROWS;
  const level = new Uint8Array(n);
  const key = new Float32Array(n);
  const letter = new Uint8Array(n);
  [..."FELIPEBC2"].forEach((ch, li) =>
    FONT[ch].forEach((row, y) =>
      [...row].forEach((v, x) => {
        if (v === "#") letter[(2 + y) * COLS + 3 + li * 6 + x] = 1;
      }),
    ),
  );
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    if (letter[i]) {
      level[i] = rnd() < 0.12 ? 3 : 4;
      key[i] = 0.08 + 0.84 * ((i % COLS) / COLS) + rnd() * 0.04;
    } else {
      const r = rnd();
      level[i] = r < 0.68 ? 0 : r < 0.87 ? 1 : r < 0.97 ? 2 : 3;
      key[i] = rnd();
    }
  }
  return { level, key, letter };
}

/** Shade of every cell at draw progress `d` (0–1). */
export const levelsAt = (
  { level, key }: ReturnType<typeof buildGrid>,
  d: number,
) => Array.from(level, (lv, i) => (key[i] <= d ? lv : 0));
