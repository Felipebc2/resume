import { expect, test } from "vitest";
import { fuzzy, match } from "./search";

test("fuzzy marks the matched letters and rewards runs", () => {
  expect(fuzzy("NormAI", "nai")).toEqual({ score: 7, idx: [0, 4, 5] });
  expect(fuzzy("NormAI", "zz")).toBeNull();
});

test("match falls back to the other fields", () => {
  expect(match("Air Quality Pipeline", ["Data", "Kafka"], "kafka")).toEqual({
    score: 0.5,
    idx: [],
  });
  expect(match("NormAI", ["2026"], "python")).toBeNull();
  expect(match("NormAI", [], "")).toEqual({ score: 0, idx: [] });
});
