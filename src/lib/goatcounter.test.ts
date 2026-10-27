import { expect, test } from "vitest";
import { parseCount } from "./goatcounter";

test("reads GoatCounter's formatted counts", () => {
  expect(parseCount("1,234")).toBe(1234);
  expect(parseCount("1 234")).toBe(1234);
  expect(parseCount("7")).toBe(7);
  expect(parseCount("")).toBeUndefined();
  expect(parseCount(undefined)).toBeUndefined();
});
