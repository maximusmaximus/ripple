import { chromium } from "playwright";

const BASE = process.env.QA_URL || "http://127.0.0.1:8080";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const errors = [];
const results = [];

async function enter(page) {
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForSelector("[data-hold-done='1']", { timeout: 15000 }).catch(() => {});
  const gate = page.locator("[data-session-gate='open']");
  if (await gate.count()) {
    const btn = page.getByRole("button", { name: /Make new session/i });
    if (await btn.count()) await btn.click();
    await page.waitForTimeout(300);
  }
  const pair = page.locator("[data-pair-overlay='true']");
  if (await pair.count()) {
    await page.waitForSelector("[data-pair-hold='0']", { timeout: 8000 }).catch(() => {});
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    if (await pair.count()) await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
  }
  const fab = page.locator("[data-menu-fab='true']");
  if (await fab.count()) {
    await fab.click();
  } else {
    await page.evaluate(() => {
      try {
        const raw = localStorage.getItem("ripple-world-v3");
        const data = raw ? JSON.parse(raw) : { state: {} };
        data.state = { ...(data.state || {}), dockOpen: true };
        localStorage.setItem("ripple-world-v3", JSON.stringify(data));
      } catch {}
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-hold-done='1']", { timeout: 12000 }).catch(() => {});
  }
  await page.waitForSelector("[data-dock-pin='viscosity']", { timeout: 8000 });
}

const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
page.on("pageerror", (e) => errors.push(e.message));

try {
  await enter(page);

  await page.locator("[data-dock-pin='viscosity']").click({ force: true });
  await page.waitForTimeout(120);
  const one = await page.getAttribute("[data-pinned-sliders]", "data-pin-count");
  const viscPinned = await page.getAttribute("[data-dock-pin='viscosity']", "data-pinned");
  results.push({ name: "pin viscosity docks one bar", ok: one === "1" && viscPinned === "1", one, viscPinned });

  await page.locator("[data-dock-pin='wave']").click({ force: true });
  await page.waitForTimeout(120);
  const two = await page.getAttribute("[data-pinned-sliders]", "data-pin-count");
  const idsTwo = await page.locator("[data-pinned-slider]").evaluateAll((els) => els.map((e) => e.getAttribute("data-pinned-slider")));
  results.push({ name: "pin wave docks two bars", ok: two === "2" && idsTwo.join(",") === "viscosity,wave", two, idsTwo });

  await page.locator("[data-dock-pin='cam-interact']").click({ force: true });
  await page.waitForTimeout(120);
  const swapped = await page.locator("[data-pinned-slider]").evaluateAll((els) => els.map((e) => e.getAttribute("data-pinned-slider")));
  const wavePinned = await page.getAttribute("[data-dock-pin='wave']", "data-pinned");
  results.push({
    name: "third pin replaces last",
    ok: swapped.join(",") === "viscosity,cam-interact" && wavePinned === "0",
    swapped,
    wavePinned,
  });

  await page.locator("[data-dock-pin='viscosity']").click({ force: true });
  await page.waitForTimeout(120);
  const afterUnpin = await page.locator("[data-pinned-slider]").evaluateAll((els) => els.map((e) => e.getAttribute("data-pinned-slider")));
  results.push({ name: "unpin from menu", ok: afterUnpin.join(",") === "cam-interact", afterUnpin });

  const geo = await page.locator("[data-pinned-slider='cam-interact']").evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      axis: el.getAttribute("data-pin-axis"),
      width: r.width,
      height: r.height,
      x: r.x,
      vw: window.innerWidth,
      writingMode: cs.writingMode,
    };
  });
  results.push({
    name: "canvas bar is vertical on the far right",
    ok: geo.axis === "v" && geo.height > geo.width && geo.x > geo.vw * 0.7,
    geo,
  });
} catch (e) {
  errors.push(String(e && e.message ? e.message : e));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(JSON.stringify({ ok: failed.length === 0 && errors.length === 0, results, errors }, null, 2));
if (failed.length || errors.length) process.exit(1);
