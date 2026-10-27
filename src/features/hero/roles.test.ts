import { expect, test } from "vitest";
import { padRoles } from "./roles";

test("pads roles to equal length with non-breaking spaces", () => {
  const out = padRoles(["Tech Lead", "LLM Engineer"]);
  expect(out.map((r) => r.length)).toEqual([12, 12]);
  expect(out[0]).toBe("Tech Lead   ");
});
