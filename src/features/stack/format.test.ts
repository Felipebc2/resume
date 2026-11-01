import { expect, test } from "vitest";
import { formatStat } from "./format";

test("formats each stat kind like the draft", () => {
  expect(formatStat(922, "int")).toBe("922");
  expect(formatStat(1234.4, "int")).toBe("1,234");
  expect(formatStat(2.6, "plus")).toBe("3+");
  expect(formatStat(2.6, "times")).toBe("3×");
});
