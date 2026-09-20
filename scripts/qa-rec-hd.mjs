import { chromium } from "playwright";

const BASE = process.env.QA_URL || "http://127.0.0.1:8080";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=swiftshader", "--enable-webgl"],
});
const errors = [];

async function enter(page) {
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.evaluate(() => {
    try {
      localStorage.removeItem("ripple-rec-hd");
    } catch {}
  });
  await page.reload({ waitUntil: "domcontentloaded" });
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
}

async function openSession(page) {
  const fab = page.locator("[data-menu-fab='true']");
  if (await fab.count()) {
    await fab.click({ force: true });
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
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
  }
  await page.waitForSelector("[data-dock-open='1']", { timeout: 8000 });
  const down = page.locator("[data-dock-step='down']");
  for (let i = 0; i < 8; i++) {
    if (await page.locator("[data-rec-hd-toggle]").count()) break;
    if (await down.count()) await down.click({ force: true });
    await page.waitForTimeout(180);
  }
}

try {
  const page = await (
    await browser.newContext({ viewport: { width: 1280, height: 800 } })
  ).newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await enter(page);
  const recOff = await page.getAttribute("button[aria-label='Start recording']", "data-rec-hd");
  await openSession(page);
  const toggle = page.locator("[data-rec-hd-toggle]");
  await toggle.waitFor({ timeout: 8000 });
  const before = await toggle.getAttribute("data-rec-hd-toggle");
  await page.locator("[data-rec-hd-toggle] [data-rec-hd='off']").click({ force: true });
  await page.waitForTimeout(200);
  const after = await page.locator("[data-rec-hd-toggle]").getAttribute("data-rec-hd-toggle");
  const recOn = await page.getAttribute("button[aria-label='Start recording']", "data-rec-hd");
  const stored = await page.evaluate(() => localStorage.getItem("ripple-rec-hd"));
  if (before !== "0") throw new Error("HD should start off");
  if (after !== "1") throw new Error("HD toggle did not turn on");
  if (recOn !== "on") throw new Error("REC did not switch to HD");
  if (stored !== "on") throw new Error("HD pref not saved");
  console.log(JSON.stringify({ ok: true, recOff, recOn, stored, errors }));
} catch (err) {
  console.log(JSON.stringify({ ok: false, error: String(err), pageErrors: errors }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
