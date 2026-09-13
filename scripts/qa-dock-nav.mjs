import { chromium } from "playwright";

const BASE = process.env.QA_URL || "http://127.0.0.1:8080";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const errors = [];
const results = [];

async function dismissChrome(page) {
  await page.waitForSelector("[data-hold-done='1']", { timeout: 15000 }).catch(() => {});
  const gate = page.locator("[data-session-gate='open']");
  if (await gate.count()) {
    const btn = page.getByRole("button", { name: /Make new session/i });
    if (await btn.count()) await btn.click();
    await page.waitForTimeout(250);
  }
  const pair = page.locator("[data-pair-overlay='true']");
  if (await pair.count()) {
    await page.waitForSelector("[data-pair-hold='0']", { timeout: 8000 }).catch(() => {});
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    if (await pair.count()) await page.keyboard.press("Escape");
  }
}

async function openMenu(page) {
  const fab = page.locator("[data-menu-fab='true']");
  if (await fab.count()) await fab.click({ force: true });
  await page.waitForSelector("[data-dock-open='1']", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(350);
}

function track(page, label) {
  page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
}

function vis(r, vw, vh) {
  return r && r.w > 120 && r.h > 80 && r.y < vh - 40 && r.x < vw - 40 && r.y + r.h > 40;
}

try {
  const desktop = await (await browser.newContext({ viewport: { width: 1100, height: 720 } })).newPage();
  track(desktop, "desktop");
  await desktop.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 20000 });
  await dismissChrome(desktop);
  await openMenu(desktop);

  const geo = await desktop.evaluate(() => {
    const card = document.querySelector(".controls-dock")?.getBoundingClientRect();
    const stepper = document.querySelector("[data-dock-stepper='true']")?.getBoundingClientRect();
    const presets = document.querySelector("[data-dock-section='presets']")?.getBoundingClientRect();
    const box = (r) => r && { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    return {
      vw: innerWidth,
      vh: innerHeight,
      open: document.querySelector("[data-dock-open]")?.getAttribute("data-dock-open"),
      opacity: document.querySelector(".studio-lift-dock") && getComputedStyle(document.querySelector(".studio-lift-dock")).opacity,
      card: box(card),
      stepper: box(stepper),
      presets: box(presets),
    };
  });
  const deskOk =
    geo.open === "1" &&
    Number(geo.opacity) > 0.9 &&
    vis(geo.card, geo.vw, geo.vh) &&
    vis(geo.presets, geo.vw, geo.vh) &&
    geo.stepper &&
    geo.stepper.x >= geo.card.x + geo.card.w - 8;
  results.push({ name: "desktop menu card is on screen with outside arrows", ok: deskOk, geo });

  await desktop.locator("[data-dock-step='down']").click({ force: true });
  await desktop.waitForTimeout(400);
  const after = await desktop.getAttribute("[data-dock-cluster]", "data-dock-cursor");
  results.push({ name: "down jumps to the next feature", ok: after === "surface", after });

  const land = await (
    await browser.newContext({
      viewport: { width: 844, height: 390 },
      isMobile: true,
      hasTouch: true,
    })
  ).newPage();
  track(land, "landscape");
  await land.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 20000 });
  await dismissChrome(land);
  await openMenu(land);

  const landGeo = await land.evaluate(() => {
    const card = document.querySelector(".controls-dock")?.getBoundingClientRect();
    const stepper = document.querySelector("[data-dock-stepper='true']")?.getBoundingClientRect();
    const presets = document.querySelector("[data-dock-section='presets']")?.getBoundingClientRect();
    const box = (r) => r && { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    return {
      vw: innerWidth,
      vh: innerHeight,
      open: document.querySelector("[data-dock-open]")?.getAttribute("data-dock-open"),
      opacity: document.querySelector(".studio-lift-dock") && getComputedStyle(document.querySelector(".studio-lift-dock")).opacity,
      card: box(card),
      stepper: box(stepper),
      presets: box(presets),
    };
  });
  const landOk =
    landGeo.open === "1" &&
    Number(landGeo.opacity) > 0.9 &&
    vis(landGeo.card, landGeo.vw, landGeo.vh) &&
    vis(landGeo.presets, landGeo.vw, landGeo.vh) &&
    landGeo.card.h > landGeo.vh * 0.55 &&
    landGeo.stepper &&
    landGeo.stepper.x >= landGeo.card.x + landGeo.card.w - 8;
  results.push({ name: "landscape menu fills the sheet and shows presets", ok: landOk, landGeo });
} catch (err) {
  errors.push(String(err?.message || err));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(JSON.stringify({ results, errors }, null, 2));
if (failed.length || errors.length) {
  console.error(`qa-dock-nav failed ${failed.length} checks ${errors.length} errors`);
  process.exit(1);
}
console.log(`qa-dock-nav ok ${results.length}`);
