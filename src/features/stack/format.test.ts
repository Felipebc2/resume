import { expect, test } from "vitest";
import { formatStat } from "./format";

test("formats each stat kind like the draft", () => {
  expect(formatStat(922, "int")).toBe("922");
  expect(formatStat(1234.4, "int")).toBe("1,234");
  expect(formatStat(2.6, "plus")).toBe("3+");
  expect(formatStat(99.8, "neg")).toBe("−99.8%");
  expect(formatStat(0, "ord")).toBe("1th");
  expect(formatStat(4, "ord")).toBe("4th");
});
