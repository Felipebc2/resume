type P = [number, number];
export type Term = { f: number; amp: number; ph: number };

/** Catmull-Rom through the captured points, 6 samples per segment */
const smooth = (s: P[]): P[] => {
  const o: P[] = [];
  for (let i = 0; i < s.length - 1; i++) {
    const p0 = s[Math.max(0, i - 1)],
      p1 = s[i],
      p2 = s[i + 1],
      p3 = s[Math.min(s.length - 1, i + 2)];
    for (let k = 0; k < 6; k++) {
      const t = k / 6,
        t2 = t * t,
        t3 = t2 * t;
      const c = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b +
          (-a + c) * t +
          (2 * a - 5 * b + 4 * c - d) * t2 +
          (-a + 3 * b - 3 * c + d) * t3);
      o.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  o.push(s[s.length - 1]);
  return o;
};

/** Pen strokes → one closed path (drawn there and back) → DFT terms, biggest first.
    `jumps` marks the samples where the pen lifts between strokes. */
export function epicycles(
  { aspect, strokes }: { aspect: number; strokes: P[][] },
  M = 300,
) {
  const raw = strokes
    .filter((st) => st.length > 1)
    .flatMap((st, si) =>
      smooth(st.map(([x, y]) => [x, y / aspect])).map(([x, y], i) => ({
        x,
        y,
        up: si > 0 && i === 0,
      })),
    );
  /* centre on the ink's centroid (length-weighted) and fit into a unit box */
  let mx = 0,
    my = 0,
    w = 0;
  for (let i = 1; i < raw.length; i++) {
    if (raw[i].up) continue;
    const d = Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y);
    mx += ((raw[i].x + raw[i - 1].x) / 2) * d;
    my += ((raw[i].y + raw[i - 1].y) / 2) * d;
    w += d;
  }
  mx /= w;
  my /= w;
  const reach = Math.max(
    ...raw.map((q) => Math.max(Math.abs(q.x - mx), Math.abs(q.y - my))),
  );
  for (const q of raw) {
    q.x = (q.x - mx) / (2 * reach);
    q.y = (q.y - my) / (2 * reach);
  }

  /* M samples evenly spaced along the path */
  const len = [0];
  for (let i = 1; i < raw.length; i++)
    len.push(
      len[i - 1] + Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y),
    );
  const pts: P[] = [];
  const jumps = new Set<number>();
  let j = 0;
  for (let k = 0; k < M; k++) {
    const d = (len[len.length - 1] * k) / (M - 1);
    while (j < len.length - 2 && len[j + 1] < d) j++;
    if (raw[j + 1].up) jumps.add(k);
    const f = (d - len[j]) / (len[j + 1] - len[j] || 1);
    pts.push([
      raw[j].x + (raw[j + 1].x - raw[j].x) * f,
      raw[j].y + (raw[j + 1].y - raw[j].y) * f,
    ]);
  }

  /* there and back, so the series closes without a seam */
  const loop = [...pts, ...pts.toReversed()];
  const N = loop.length;
  const terms: Term[] = [];
  for (let k = 0; k < N; k++) {
    let re = 0,
      im = 0;
    for (let n = 0; n < N; n++) {
      const ph = (-2 * Math.PI * k * n) / N,
        [x, y] = loop[n];
      re += x * Math.cos(ph) - y * Math.sin(ph);
      im += x * Math.sin(ph) + y * Math.cos(ph);
    }
    terms.push({
      f: k > N / 2 ? k - N : k,
      amp: Math.hypot(re, im) / N,
      ph: Math.atan2(im, re),
    });
  }
  terms.sort((a, b) => b.amp - a.amp);
  return { terms, jumps, pts, M, N };
}

/** tip of the first `k` epicycles at sample `s` of `n` */
export function tip(terms: Term[], k: number, s: number, n: number): P {
  const t = (s / n) * 2 * Math.PI;
  let x = 0,
    y = 0;
  for (let i = 0; i < k; i++) {
    const c = terms[i];
    x += c.amp * Math.cos(c.f * t + c.ph);
    y += c.amp * Math.sin(c.f * t + c.ph);
  }
  return [x, y];
}
