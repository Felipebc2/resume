import { expect, test } from "vitest";
import { inGap, nextStep, push } from "./steps";

const P0 = 900;
const P1 = 1800;
const go = (from: number, to: number) => nextStep(from, to, [P0, P1]);
const all = (from: number, to: number) => nextStep(from, to, [0, P0, P1], 160);

test("scrolls freely away from the steps", () => {
  expect(go(0, 300)).toBeNull();
  expect(go(P0, P0 - 300)).toBeNull();
  expect(go(P1, P1 + 300)).toBeNull();
  expect(go(3000, 2500)).toBeNull();
});

test("a fling from either side stops dead on the first step it crosses", () => {
  expect(go(600, 3100)).toBe(P0);
  expect(go(3000, 500)).toBe(P1);
});

test("leaving a step towards the other one hops the whole gap", () => {
  expect(go(P0, P0 + 40)).toBe(P1);
  expect(go(P1, P1 - 40)).toBe(P0);
  expect(go(1300, 1350)).toBe(P1);
  expect(go(1300, 1250)).toBe(P0);
});

test("easing into a step does not count as leaving it", () => {
  expect(go(P0 - 2, P0 + 1)).toBeNull();
  expect(go(P1 + 2, P1 - 1)).toBeNull();
});

test("someone still scrolling after landing passes; a momentum tail doesn't", () => {
  let p = { dir: 0, px: 0, pass: false };
  for (const d of [12, 8, 5, 3, 2, 1]) p = push(p, d); // decaying tail
  expect(p.pass).toBe(false);
  p = { dir: 0, px: 0, pass: false };
  for (const d of [100, 100]) p = push(p, d); // two wheel notches
  expect(p.pass).toBe(true);
  expect(push({ dir: 1, px: 140 }, -30).px).toBe(30); // turning back starts over
});

test("stopping in the gap settles on the nearest step", () => {
  expect(inGap(1100, [P0, P1])).toBe(P0);
  expect(inGap(1600, [P0, P1])).toBe(P1);
  expect(inGap(P0, [P0, P1])).toBeNull();
  expect(inGap(P1 + 100, [P0, P1])).toBeNull();
});

test("off the hero top the page scrolls freely for `pull`, then pulls onto the greeting", () => {
  expect(all(0, 100)).toBeNull(); // first wheel notch
  expect(all(100, 200)).toBe(P0); // second one
  expect(all(0, 3000)).toBe(P0); // a fling still stops on it
  expect(all(300, 320)).toBe(P0);
  expect(all(P0, P0 - 40)).toBe(0);
  expect(all(P0, P0 + 40)).toBe(P1);
  expect(all(0, -40)).toBeNull();
  expect(inGap(100, [0, P0, P1], 160)).toBeNull(); // resting inside the pull stays
  expect(inGap(300, [0, P0, P1], 160)).toBe(0);
  expect(inGap(600, [0, P0, P1], 160)).toBe(P0);
});
