export type Hit = { score: number; idx: number[] };

/** in-order subsequence match; consecutive letters and word starts score higher */
export function fuzzy(s: string, t: string): Hit | null {
  s = s.toLowerCase();
  t = t.toLowerCase();
  let i = 0,
    score = 0,
    last = -2;
  const idx: number[] = [];
  for (let j = 0; j < s.length && i < t.length; j++) {
    if (s[j] !== t[i]) continue;
    score += j === last + 1 ? 3 : 1;
    if (j === 0 || s[j - 1] === " ") score += 2;
    idx.push(j);
    last = j;
    i++;
  }
  return i === t.length ? { score, idx } : null;
}

/** a strong fuzzy hit on the name wins, then a plain substring in any other field, then a weak name hit */
export function match(name: string, fields: string[], t: string): Hit | null {
  if (!t) return { score: 0, idx: [] };
  const m = fuzzy(name, t);
  if (m && m.score >= t.length) return m;
  const lt = t.toLowerCase();
  if (fields.some((x) => x.toLowerCase().includes(lt)))
    return { score: 0.5, idx: [] };
  return m && m.score > t.length * 0.8 ? m : null;
}
