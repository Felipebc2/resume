import { expect, test } from "vitest";
import { entries, mi, procs, span } from "./entries";

test("git log runs HEAD → newest → root commit", () => {
  const ids = entries.map((e) => e.id);
  expect(ids[0]).toBe("head");
  expect(ids.at(-1)).toBe("idp");
  expect(ids.slice(1, 4)).toEqual(["eko", "nexai", "nexara"]);
  expect(new Set(ids).size).toBe(ids.length);
});

test("spans count both ends and roll months into years", () => {
  expect(span(mi("2026-04"), mi("2026-06"), 0)).toEqual({ y: 0, m: 3 });
  expect(span(mi("2023-08"), null, mi("2026-10"))).toEqual({ y: 3, m: 3 });
});

test("htop lists running processes first, PIDs follow start dates", () => {
  const running = procs.filter((p) => p.end === null);
  expect(procs.slice(0, running.length)).toEqual(running);
  const byStart = [...procs].sort((a, b) => a.start - b.start);
  expect(byStart.map((p) => p.pid)).toEqual(
    [...byStart.map((p) => p.pid)].sort((a, b) => a - b),
  );
  expect(procs.find((p) => p.id === "idp")?.end).toBeNull();
});
