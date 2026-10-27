import { expect, test } from "vitest";
import { parseContributions } from "./github";

test("reads the yearly total from GitHub's contributions fragment", () => {
  expect(
    parseContributions(
      '<h2 id="js-contribution-activity-description">\n  1,923\n  contributions\n    in the last year\n</h2>',
    ),
  ).toBe(1923);
  expect(parseContributions("<h2>nothing here</h2>")).toBeUndefined();
});
