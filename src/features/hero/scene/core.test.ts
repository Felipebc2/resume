import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import pt from "@/i18n/messages/pt.json";
import {
  buildEpisode,
  fmix32,
  gitLog,
  makeR,
  mulberry32,
  nextSeed,
  resetView,
  sample,
} from "./core";

// from docs/prototypes/hero-motion-v4.4.html: [seed, fmix32, nextSeed, domain, errors, micros, mode] via __hero.sample
const REF: [number, number, number, string, string, string, string][] = [
  [0, 0, 1013904223, "auth", "failing,hal,naming", "marquee,typeDelete", "C"],
  [1, 1364076727, 1015568748, "auth", "failing,hal,wrongLayer", "", "C"],
  [2, 821347078, 1017233273, "orders", "dup,orphan,wrongLayer", "marquee", "B"],
  [3, 2247144487, 1018897798, "orders", "dep,dup,failing", "typeDelete", "C"],
  [7, 415870660, 1025555898, "auth", "circular,orphan,typo", "", "C"],
  [42, 142593372, 1083814273, "auth", "failing,hal,orphan", "undo", "B"],
  [
    99,
    2622321114,
    1178692198,
    "notifications",
    "dep,failing,hal",
    "pin,guides",
    "C",
  ],
  [
    123,
    2235285516,
    1218640798,
    "notifications",
    "circular,failing,typo",
    "",
    "B",
  ],
  [256, 1164980575, 1440022623, "orders", "hal,orphan,wrongLayer", "undo", "B"],
  [
    1000,
    1718167128,
    2678429223,
    "auth",
    "circular,dup,wrongLayer",
    "pin,typeDelete",
    "B",
  ],
  [
    4096,
    2056573805,
    3536831327,
    "orders",
    "failing,naming,wrongLayer",
    "undo,pin",
    "B",
  ],
  [
    12345,
    1011272156,
    87628868,
    "payments",
    "dup,hal,naming",
    "undo,guides",
    "C",
  ],
  [
    65535,
    2721820263,
    2724367698,
    "notifications",
    "dup,naming,wrongLayer",
    "",
    "B",
  ],
  [99999, 15374403, 4255982450, "notifications", "naming,orphan,typo", "", "B"],
  [
    271828,
    1937328306,
    2506839843,
    "notifications",
    "dep,failing,typo",
    "sameNode",
    "B",
  ],
  [314159, 2996201333, 4248370882, "orders", "dup,orphan,typo", "", "C"],
  [
    1234567,
    2885493108,
    2987172410,
    "payments",
    "dep,orphan,typo",
    "marquee",
    "B",
  ],
  [
    2147483647,
    4190899880,
    3159723346,
    "notifications",
    "dep,hal,typo",
    "",
    "C",
  ],
  [3000000000, 2246745666, 2222438751, "notifications", "dep,dup,hal", "", "B"],
  [
    4294967295,
    2180083513,
    1012239698,
    "orders",
    "hal,orphan,wrongLayer",
    "sameNode,typeDelete,guides",
    "B",
  ],
];

// the engine measures labels at 18px Geist Mono; the prototype falls back to this when it can't
const textW = (s: string) => s.length * 10.8;
const dicts = { en: en.Hero.scene, pt: pt.Hero.scene };
const TERM: Record<string, keyof typeof en.Hero.scene.term> = {
  tests: "tests",
  rerun: "rerun",
  fail: "fail",
  pass: "pass",
  deploy: "deploy",
};

describe("rng", () => {
  it("fmix32 and nextSeed match the prototype", () => {
    for (const [seed, fmix, next] of REF) {
      expect(fmix32(seed)).toBe(fmix);
      expect(nextSeed(seed)).toBe(next);
    }
  });
  it("mulberry32 is the prototype's stream", () => {
    const r = mulberry32(fmix32(42));
    expect([r(), r(), r()]).toEqual([
      0.4869888692628592, 0.5050487946718931, 0.07134048454463482,
    ]);
    const R = makeR(7);
    for (let i = 0; i < 1000; i++) expect(R.rng()).toBeGreaterThanOrEqual(0);
  });
});

describe("episode generator", () => {
  it("sample(seed) matches the prototype for the 20 reference seeds", () => {
    for (const [seed, , , domain, errors, micros, mode] of REF) {
      const s = sample(seed);
      expect([s.domain, s.errors.join(), s.micros.join(), s.mode]).toEqual([
        domain,
        errors,
        micros,
        mode,
      ]);
    }
  });

  it("200 seeds: no throw, every error gets its fix, deployed in 20–34 s, every string in both languages", () => {
    expect(Object.keys(dicts.pt.say).sort()).toEqual(
      Object.keys(dicts.en.say).sort(),
    );
    let seed = 1;
    for (let i = 0; i < 200; i++, seed = nextSeed(seed)) {
      resetView();
      const ep = buildEpisode(seed, 0, null, textW, "");
      expect(ep.commits.map((c) => c.key).sort()).toEqual(
        [...ep.errors].sort(),
      );
      expect(ep.deployed).toBeGreaterThanOrEqual(20);
      expect(ep.deployed).toBeLessThanOrEqual(34);
      for (const d of Object.values(dicts)) {
        for (const a of Object.values(ep.actors))
          for (const s of a.says)
            expect(d.say[s.key as keyof typeof d.say], s.key).toHaveLength(2);
        for (const c of ep.chips)
          expect(d.chip[c.key as keyof typeof d.chip], c.key).toBeTruthy();
        for (const c of ep.commits)
          expect(d.commit[c.key as keyof typeof d.commit], c.key).toBeTruthy();
        for (const l of ep.termLines)
          if (l.key !== "commit")
            expect(d.term[TERM[l.key]], l.key).toBeTruthy();
      }
    }
  });
});

describe("git log", () => {
  it("one commit per fix, when it happens, HEAD at deployed, every message in both languages", () => {
    let seed = 1;
    for (let i = 0; i < 200; i++, seed = nextSeed(seed)) {
      resetView();
      const ep = buildEpisode(seed, 0, null, textW, "");
      const rows = gitLog(ep);
      const fixes = rows.filter((r) => r.kind === "fix");
      expect(fixes.map((r) => r.t0)).toEqual(
        [...ep.commits].map((c) => c.t).sort((a, b) => a - b),
      );
      expect(rows.find((r) => r.kind === "head")!.t0).toBe(ep.deployed);
      const wip = rows.find((r) => r.kind === "wip")!;
      expect(wip.t1).toBeLessThanOrEqual(Math.min(...fixes.map((r) => r.t0)));
      // after the IA is done the log reads init, entities, the fixes and HEAD: 6 rows at most
      expect(rows.filter((r) => r.kind !== "wip").length).toBeLessThanOrEqual(
        6,
      );
      for (const d of Object.values(dicts))
        for (const r of rows)
          expect(d.log[r.key as keyof typeof d.log], r.key).toBeTruthy();
    }
  });
});
