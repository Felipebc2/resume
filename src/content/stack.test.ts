import { existsSync } from "node:fs";
import { expect, test } from "vitest";
import { stack } from "./stack";

test("every stack icon has a file in public/icons", () => {
  const missing = stack
    .flatMap((c) => c.tools)
    .filter((tool) => tool.icon && !existsSync(`public/icons/${tool.icon}.svg`))
    .map((tool) => tool.icon);
  expect(missing).toEqual([]);
});
