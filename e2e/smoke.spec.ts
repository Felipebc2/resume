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
  // mobile emulation scales wheel deltas down; this one still crosses the greeting, so it glides there
  await page.mouse.wheel(0, 2500);
  await expect(nav).toHaveAttribute("data-nav", "in");
  await nav.getByRole("link", { name: "Stack" }).click();
  const title = page.getByRole("heading", { name: /This is my/ });
  await expect
    .poll(() => title.evaluate((el) => getComputedStyle(el).opacity))
    .toBe("1");
  await expect(nav.getByRole("link", { name: "Stack" })).toHaveAttribute(
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

test("settings switch the theme and the language in place", async ({
  page,
}) => {
  await page.goto("/");
  const html = page.locator("html");
  await page.emulateMedia({ colorScheme: "light" });
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "electric");
  await expect(html).toHaveAttribute("data-mode", "light"); // follows the system until chosen
  await page.getByRole("button", { name: "Settings" }).click();
  const menu = page.getByRole("dialog", { name: "Settings" });
  await menu.getByRole("button", { name: /^Theme:/ }).click();
  await menu.getByRole("radio", { name: /Midnight/ }).click();
  await expect(html).toHaveAttribute("data-theme", "midnight");
  await menu.getByRole("switch", { name: /^Mode/ }).click();
  await expect(html).toHaveAttribute("data-mode", "dark");
  await menu.getByRole("switch", { name: /^Language/ }).click();
  await expect(html).toHaveAttribute("lang", "pt-BR");
  await expect(
    page.getByRole("navigation", { name: "Seções" }).getByRole("link", {
      name: "Projetos",
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "midnight");
  await expect(html).toHaveAttribute("data-mode", "dark");
  await expect(html).toHaveAttribute("lang", "pt-BR");
});
