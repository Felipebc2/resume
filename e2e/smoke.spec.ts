import { expect, test } from "@playwright/test";

test("home renders without runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Born to",
  );
  await expect(
    page.getByRole("navigation", { name: "Sections" }),
  ).toBeVisible();
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(
    1,
  );
  expect(errors).toEqual([]);
});

test("nav hides on the hero, drops in on scroll, Stack plays the step", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Sections" });
  await expect(nav).not.toHaveAttribute("data-nav", "in");
  await page.mouse.wheel(0, 1000); // mobile emulation scales wheel deltas down
  await expect(nav).toHaveAttribute("data-nav", "in");
  await nav.getByRole("link", { name: "Stack" }).click();
  const title = page.getByRole("heading", { name: /This is my/ });
  await expect
    .poll(() => title.evaluate((el) => getComputedStyle(el).opacity))
    .toBe("1");
  await expect(page.getByRole("link", { name: "Stack" })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await page.getByRole("link", { name: "felipebc2/resume" }).click();
  await expect(nav).toHaveAttribute("data-nav", "out");
});

test("reduced motion starts with animations off", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-still", "");
  const toast = page.getByRole("status");
  await expect(toast).toBeVisible();
  await toast.getByRole("button", { name: "Turn animations on" }).click();
  await expect(toast).toBeHidden();
  await expect(html).not.toHaveAttribute("data-still");
});

test("Portuguese lives under /pt and English has no prefix", async ({
  page,
}) => {
  await page.goto("/pt");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt");
  await page.goto("/en");
  await expect(page).toHaveURL(/\/$/);
});
