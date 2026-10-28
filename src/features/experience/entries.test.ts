import { expect, test } from "vitest";
import { entries, mi, procs, span } from "./entries";

test("git log runs HEAD → newest → root commit", () => {
  const ids = entries.map((e) => e.id);
  expect(ids[0]).toBe("head");
  expect(ids.at(-1)).toBe("idp");
  expect(ids.slice(1, 4)).toEqual(["eko", "ctfw", "nexai"]);
  expect(new Set(ids).size).toBe(ids.length);
});

test("spans count both ends and roll months into years", () => {
  expect(span(mi("2026-04"), mi("2026-06"), 0)).toEqual({ y: 0, m: 3 });
  expect(span(mi("2023-08"), null, mi("2026-10"))).toEqual({ y: 3, m: 3 });
});

test("htop lists running processes first, PIDs follow start dates", () => {
  const running = procs.filter((p) => p.end === null);
  expect(procs.slice(0, running.length)).toEqual(running);
  const starts = [...procs].sort((a, b) => a.pid - b.pid).map((p) => p.start);
  expect(starts).toEqual([...starts].sort((a, b) => a - b));
  expect(procs.find((p) => p.id === "idp")?.end).toBeNull();
});

test("roles and research span start to end; events take one month", () => {
  const ta = procs.find((p) => p.id === "ta")!;
  expect(span(ta.start, ta.end, 0)).toEqual({ y: 0, m: 5 });
  const ev = procs.find((p) => p.id === "ctfw")!;
  expect(ev.end).toBe(ev.start);
});
