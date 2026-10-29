import { expect, test, type Page } from "@playwright/test";

// markers the lazy chunks carry (scene/engine.ts ENGINE_ID, scene/eggs.ts EGGS_ID)
const ENGINE = "fbc2-hero-engine";
const EGGS = "fbc2-hero-eggs";
const SCENE = /^Animated canvas/;

type Hero = {
  ep: {
    MAIN: number;
    N: Record<
      string,
      { layer: string; cur: { layer: string }; cx: number; cy: number }
    >;
  };
  seed: number;
  speed: number;
  phase: string;
  seek: (t: number) => void;
  resume: () => void;
  P: (p: { layer: string; lx: number; ly: number }) => { x: number; y: number };
  egg: { back: unknown; hold: Record<string, unknown> };
};
declare global {
  interface Window {
    __hero?: Hero;
    __HERO_TEST__?: boolean;
  }
}

/** every script the page downloads, to prove a lazy chunk was (or wasn't) fetched */
function scripts(page: Page) {
  const bodies: string[] = [];
  page.on("response", async (r) => {
    if (r.request().resourceType() === "script")
      bodies.push(await r.text().catch(() => ""));
  });
  return (id: string) => bodies.some((b) => b.includes(id));
}
const withHooks = (page: Page) =>
  page.addInitScript(() => {
    window.__HERO_TEST__ = true;
  });
const errorsOf = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return errors;
};

test.describe("hero scene, desktop", () => {
  test.skip(({ isMobile }) => isMobile, "the engine is desktop-only");

  test("loads the engine and plays without console errors", async ({
    page,
  }) => {
    const errors = errorsOf(page);
    const fetched = scripts(page);
    await page.goto("/");
    await expect(page.locator(`[data-engine="${ENGINE}"]`)).toHaveCount(1);
    await expect(page.locator("[data-engine] .plate")).toHaveCount(4);
    await expect(page.locator("[data-engine] .node").first()).toBeAttached();
    expect(fetched(ENGINE)).toBe(true);
    expect(fetched(EGGS)).toBe(false); // only on the first pointer over the scene
    expect(errors).toEqual([]);
  });

  test("hover doubles the speed, Turbo takes it to 4×", async ({ page }) => {
    await withHooks(page);
    await page.goto("/");
    const ship = page.locator("[data-engine] [data-el=ship]");
    await expect(ship).toBeAttached();
    const box = (await page.getByRole("group", { name: SCENE }).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
    await expect(ship).toHaveAttribute("data-speed", "2");
    await ship.click();
    await expect(ship).toHaveAttribute("data-speed", "4");
    await expect(ship).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(() => page.evaluate(() => window.__hero!.speed))
      .toBeGreaterThan(3.9);
  });

  test("git log: a commit per fix, HEAD once deployed; htop bars per layer", async ({
    page,
  }) => {
    await withHooks(page);
    await page.goto("/");
    await page.waitForFunction(() => window.__hero?.ep);
    const rows = page.locator("[data-engine] .glog .c:visible");
    const at = (expr: string) =>
      page.evaluate((e) => {
        const h = window.__hero!,
          ep = h.ep as unknown as Record<string, number> & {
            acts: Record<string, number>;
          };
        h.seek(new Function("ep", `return ${e}`)(ep));
      }, expr);
    await at("ep.acts['3 Erros']");
    const log = page.locator("[data-engine] .glog");
    await expect(log.locator(".c.wip")).toBeVisible();
    await expect(log.locator(".c.wip")).toContainText("wip");
    await at("ep.MAIN + 0.6");
    await expect(rows).toHaveCount(6);
    await expect(log.locator(".c.wip")).toBeHidden();
    await expect(log.locator(".c.head")).toContainText("HEAD");
    await expect(page.locator("[data-engine] .bars > div")).toHaveCount(4);
  });

  test("theme and language switch while it runs, without a restart", async ({
    page,
  }) => {
    await withHooks(page);
    const errors = errorsOf(page);
    await page.goto("/");
    await page.waitForFunction(() => window.__hero?.ep);
    const seed = await page.evaluate(() => window.__hero!.seed);
    const face = page.locator("[data-engine] .plate.l4 .face");
    const fill = () => face.evaluate((e) => getComputedStyle(e).fill);
    const before = await fill();
    await page.getByRole("button", { name: "Settings" }).click();
    const menu = page.getByRole("dialog", { name: "Settings" });
    await menu.getByRole("button", { name: /^Theme:/ }).click();
    await menu.getByRole("radio", { name: /Lemon/ }).click();
    await expect.poll(fill).not.toBe(before);
    await menu.getByRole("switch", { name: /^Mode/ }).click();
    await menu.getByRole("switch", { name: /^Language/ }).click();
    await expect(page.locator("[data-engine] [data-el=ship]")).toHaveAttribute(
      "aria-label",
      /velocidade/,
    );
    await expect(
      page.getByRole("group", { name: /^Canvas animado/ }),
    ).toHaveCount(1);
    expect(await page.evaluate(() => window.__hero!.seed)).toBe(seed);
    expect(errors).toEqual([]);
  });

  test("a node dropped on the wrong layer is carried back by Felipebc2", async ({
    page,
  }) => {
    await withHooks(page);
    const fetched = scripts(page);
    await page.goto("/");
    await page.waitForFunction(() => window.__hero?.ep);
    await page.evaluate(() => {
      const h = window.__hero!;
      h.seek(h.ep.MAIN + 2); // straight to the idle life, where nodes can be dragged
      h.resume();
    });
    await expect
      .poll(() => page.evaluate(() => window.__hero!.phase))
      .toBe("idle");
    // stage → page coordinates; the parallax follows the pointer, so read them after it settles
    const where = () =>
      page.evaluate(() => {
        const h = window.__hero!,
          n = h.ep.N.ctrl;
        const r = document
          .querySelector("[data-engine] .stage")!
          .getBoundingClientRect();
        const k = r.width / 724;
        const at = (p: { x: number; y: number }) => ({
          x: r.left + p.x * k,
          y: r.top + p.y * k,
        });
        // the bottom plate's front corner: no other plate above it there
        return {
          node: at({ x: n.cx, y: n.cy }),
          drop: at(h.P({ layer: "fw", lx: 470, ly: 430 })),
        };
      });
    let p = await where();
    for (let i = 0; i < 3; i++) {
      await page.mouse.move(p.node.x, p.node.y, { steps: 4 });
      await page.waitForTimeout(700);
      p = await where();
    }
    await expect(page.locator(`[data-eggs="${EGGS}"]`)).toHaveCount(1);
    expect(fetched(EGGS)).toBe(true);
    await page.mouse.down();
    await page.mouse.move(p.drop.x, p.drop.y, { steps: 12 });
    await page.waitForTimeout(700);
    await page.mouse.move((await where()).drop.x, (await where()).drop.y, {
      steps: 2,
    });
    await page.mouse.up();
    // it waits on the wrong plate, then he picks it up and puts it back on Interface Adapters
    await expect
      .poll(() =>
        page.evaluate(() => {
          const { egg, ep } = window.__hero!;
          return (
            !!egg.hold.ctrl || egg.back != null || ep.N.ctrl.cur.layer !== "ia"
          );
        }),
      )
      .toBe(true);
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const { egg, ep } = window.__hero!;
            return (
              !egg.hold.ctrl && egg.back == null && ep.N.ctrl.cur.layer === "ia"
            );
          }),
        { timeout: 8000 },
      )
      .toBe(true);
  });

  test("leaving the page and coming back leaves no listener behind", async ({
    page,
  }) => {
    await withHooks(page);
    await page.goto("/");
    await expect(page.locator("[data-engine]")).toHaveCount(1);
    const cdp = await page.context().newCDPSession(page);
    const listeners = async () => {
      const m: Record<string, number> = {};
      for (const target of ["window", "document"]) {
        const { result } = await cdp.send("Runtime.evaluate", {
          expression: target,
        });
        const { listeners } = await cdp.send("DOMDebugger.getEventListeners", {
          objectId: result.objectId!,
        });
        for (const l of listeners) {
          const k = `${target}:${l.type}`;
          m[k] = (m[k] ?? 0) + 1;
        }
      }
      return m;
    };
    const first = await listeners();
    // client-side navigation unmounts the home (and the engine) without a reload
    await page.evaluate(() =>
      (
        window as unknown as { next: { router: { push: (u: string) => void } } }
      ).next.router.push("/nowhere"),
    );
    await expect(page.locator("[data-engine]")).toHaveCount(0);
    const away = await listeners();
    expect(away["document:visibilitychange"] ?? 0).toBe(0);
    expect(await page.evaluate(() => window.__hero)).toBeUndefined();
    await page.evaluate(() =>
      (
        window as unknown as { next: { router: { push: (u: string) => void } } }
      ).next.router.push("/"),
    );
    await expect(page.locator("[data-engine]")).toHaveCount(1);
    const back = await listeners();
    for (const k of Object.keys({ ...first, ...back }))
      if (!k.endsWith("DOMContentLoaded"))
        expect(back[k] ?? 0, k).toBe(first[k] ?? 0);
  });

  test("reduced motion shows the final frame and never downloads the engine", async ({
    page,
  }) => {
    const fetched = scripts(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const scene = page.getByRole("group", { name: SCENE });
    await expect(scene.locator(".stage .plate")).toHaveCount(4);
    await expect(scene.locator(".chip.ok")).toContainText("deployed");
    await page.waitForTimeout(2500);
    await expect(page.locator("[data-engine]")).toHaveCount(0);
    expect(fetched(ENGINE)).toBe(false);
  });
});

test.describe("hero scene, phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.skip(({ isMobile }) => isMobile, "one phone run is enough");

  test("390 px: the four blocks, no engine", async ({ page }) => {
    const fetched = scripts(page);
    await page.goto("/");
    const blocks = page.getByRole("img", { name: SCENE }).locator("h3");
    await expect(blocks).toHaveCount(4);
    for (const b of await blocks.all()) await expect(b).toBeVisible();
    await expect(page.getByRole("group", { name: SCENE })).toBeHidden();
    await page.waitForTimeout(2500);
    expect(fetched(ENGINE)).toBe(false);
  });
});
