import {
  academic,
  lab,
  work,
  type EntryId,
  type Lab,
  type Place,
  type Work,
} from "@/content/experience";

/** "YYYY-MM" → month index, so spans are plain subtraction */
export const mi = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + m - 1;
};

/** months covered by [start, end], both inclusive; open end runs to `now` */
export const span = (start: number, end: number | null, now: number) => {
  const n = (end ?? now) - start + 1;
  return { y: Math.floor(n / 12), m: n % 12 };
};

export type Entry =
  | { kind: "head"; id: "head"; place: Place; art: string }
  | (Work & { kind: "work" })
  | (Lab & { kind: "lab" })
  | (typeof academic & { kind: "init" });

/** git log order: HEAD, then work and lab newest first (lab sorts above work of the same month), then the degree as the root commit */
export const entries: Entry[] = [
  { kind: "head", id: "head", place: "rem", art: "→" },
  ...[
    ...work.map((w) => ({
      e: { ...w, kind: "work" as const },
      k: mi(w.start),
    })),
    ...lab.map((l) => ({
      e: { ...l, kind: "lab" as const },
      k: mi(l.date) + 0.5,
    })),
  ]
    .sort((a, b) => b.k - a.k)
    .map(({ e }) => e),
  { ...academic, kind: "init" },
];

export const entryDate = (e: Entry) =>
  e.kind === "lab" ? e.date : e.kind === "head" ? null : e.start;

export type Proc = {
  id: EntryId;
  pid: number;
  start: number;
  /** null = running */
  end: number | null;
  entry: Exclude<Entry, { kind: "head" }>;
};

/** htop rows: PIDs grow with start date, running processes list first, newest first */
export const procs: Proc[] = entries
  .filter((e) => e.kind !== "head")
  .map((entry) => {
    const start = mi(entryDate(entry)!);
    const end =
      entry.kind === "lab"
        ? start
        : entry.kind === "work" && entry.end
          ? mi(entry.end)
          : null;
    return { id: entry.id, start, end, entry };
  })
  .sort((a, b) => a.start - b.start)
  .map((p, i) => ({ ...p, pid: 1000 + i * 37 }))
  .sort(
    (a, b) =>
      Number(b.end === null) - Number(a.end === null) || b.start - a.start,
  );
