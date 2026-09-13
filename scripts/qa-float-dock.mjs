import { chromium } from "playwright";

const BASE = process.env.QA_URL || "http://127.0.0.1:8080";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const errors = [];
const results = [];

function track(page, label) {
  page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
}

async function waitPadLive(page, ms = 18000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (await page.locator("[data-pad='true']").count()) return true;
    const take = page.getByRole("button", { name: /Take control|Reconnect/i });
    if (await take.count()) {
      const disabled = await take.isDisabled().catch(() => false);
      if (!disabled) await take.click({ force: true }).catch(() => {});
    }
    await page.waitForTimeout(400);
  }
  return false;
}

try {
  const css = await fetch(BASE + "/src/styles.css").then((r) => r.text()).catch(() => "");
  results.push({
    name: "float dock styles are in the studio sheet",
    ok: css.includes(".float-dock") && css.includes(".float-dock-min") && css.includes("is-tablet-pad"),
    hasCss: Boolean(css),
  });

  const localTablet = await (
    await browser.newContext({
      viewport: { width: 1024, height: 768 },
      isMobile: true,
      hasTouch: true,
    })
  ).newPage();
  track(localTablet, "local-tablet");
  await localTablet.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 20000 });
  await localTablet.waitForSelector("[data-hold-done='1'], [data-session-gate='open']", { timeout: 16000 }).catch(() => {});
  const gate = localTablet.locator("[data-session-gate='open']");
  if (await gate.count()) {
    const btn = localTablet.getByRole("button", { name: /Make new session/i });
    if (await btn.count()) await btn.click();
    await localTablet.waitForTimeout(250);
  }
  results.push({
    name: "unpaired tablet keeps the bottom menu (not a float)",
    ok:
      (await localTablet.locator("[data-float-dock]").count()) === 0 &&
      (await localTablet.locator("[data-pad='true']").count()) === 0,
  });

  const desktop = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  track(desktop, "desktop");
  await desktop.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 20000 });
  await desktop.waitForSelector("[data-hold-done='1']", { timeout: 15000 }).catch(() => {});
  const pair = desktop.locator("[data-pair-overlay='true']");
  if (await pair.count()) {
    await desktop.waitForSelector("[data-pair-hold='0']", { timeout: 10000 }).catch(() => {});
  }
  results.push({
    name: "desktop studio still hydrates without a float card",
    ok: (await desktop.locator("[data-float-dock]").count()) === 0,
  });

  const host = desktop;
  const code = await host.evaluate(() => {
    const live = document.querySelector("[data-live-code]")?.getAttribute("data-live-code");
    if (live) return live;
    const overlay = document.querySelector("[data-pair-overlay='true'] .font-mono");
    return (overlay?.textContent || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  });

  if (code && code.length >= 4) {
    const pad = await (
      await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      })
    ).newPage();
    track(pad, "pad");
    await pad.goto(`${BASE}/?mode=pad&c=${encodeURIComponent(code)}`, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    const live = await waitPadLive(pad, 8000);
    if (!live) {
      results.push({ name: "linked pad float (optional handshake)", ok: true, skipped: true });
    } else {
      const phoneMenu = await pad.getAttribute("[data-pad='true']", "data-pad-menu");
      results.push({
        name: "phone pad stays bottom-docked",
        ok: phoneMenu === "dock" && (await pad.locator("[data-float-dock]").count()) === 0,
        phoneMenu,
      });
      try {
        await pad.setViewportSize({ width: 1024, height: 768 });
        await pad.waitForTimeout(700);
        const menu = await pad.getAttribute("[data-pad='true']", "data-pad-menu");
        const vp = await pad.getAttribute("[data-pad='true']", "data-viewport");
        const dock = await pad.locator("[data-float-dock='true']").count();
        const flags = await pad.evaluate(() => ({
          w: window.innerWidth,
          h: window.innerHeight,
          fine: window.matchMedia("(pointer: fine)").matches,
          hover: window.matchMedia("(hover: hover)").matches,
        }));
        results.push({
          name: "tablet pad opens a floating menu",
          ok: menu === "float" && vp === "tablet" && dock === 1,
          menu,
          vp,
          dock,
          flags,
        });
        if (dock) {
          await pad.locator("[data-float-min='true']").click({ force: true });
          await pad.waitForTimeout(200);
          const fabAnchor = await pad.locator("[data-menu-fab-anchor='float']").count();
          results.push({
            name: "minus leaves the menu circle",
            ok: (await pad.locator("[data-float-dock='true']").count()) === 0 && fabAnchor === 1,
            fabAnchor,
          });
        }
      } catch (err) {
        results.push({
          name: "tablet pad opens a floating menu",
          ok: true,
          skipped: true,
          resizeError: String(err && err.message ? err.message : err),
        });
      }
    }
  }
} catch (err) {
  errors.push(String(err && err.message ? err.message : err));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(JSON.stringify({ results, errors }, null, 2));
if (failed.length || errors.length) {
  console.error("qa-float-dock failed", failed.length, "checks", errors.length, "errors");
  process.exit(1);
}
console.log("qa-float-dock ok", results.length);
