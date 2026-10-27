import { expect, test } from "vitest";
import { nextStep } from "./steps";

const P0 = 900;
const P1 = 1800;
const go = (from: number, to: number) => nextStep(from, to, P0, P1);

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
