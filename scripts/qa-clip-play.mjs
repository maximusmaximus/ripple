import { chromium } from "playwright";

const BASE = process.env.QA_URL || "http://127.0.0.1:8080";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=swiftshader", "--enable-webgl"],
});
const errors = [];
const page = await (
  await browser.newContext({
    viewport: { width: 1280, height: 800 },
    acceptDownloads: true,
  })
).newPage();
page.on("pageerror", (e) => errors.push(e.message));

async function enter() {
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.evaluate(() => {
    try {
      localStorage.removeItem("ripple-rec-autosave");
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
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  await page.keyboard.press("Escape");
}

async function recOnce() {
  await page.evaluate(() => {
    const btn = document.querySelector("button[aria-label='Start recording']");
    if (btn instanceof HTMLButtonElement) btn.click();
  });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const btn = document.querySelector("button[aria-label^='Stop recording']");
    if (btn instanceof HTMLButtonElement) btn.click();
  });
  await page.waitForTimeout(800);
}

try {
  await enter();
  await page.evaluate(() => {
    const btn = document.querySelector("button[aria-label='Start recording']");
    if (btn instanceof HTMLButtonElement) btn.click();
  });
  const notice = page.locator("[data-clip-notice]");
  await notice.waitFor({ timeout: 8000 });
  const askedAtStart = (await page.locator("[data-clip-ask='1']").count()) > 0;
  if (!askedAtStart) throw new Error("first REC did not ask to save");
  const box = await notice.boundingBox();
  if (!box) throw new Error("notice missing box");
  const compact = box.width <= 360 && box.x > 800;
  await page.waitForTimeout(1100);
  await page.evaluate(() => {
    const btn = document.querySelector("button[aria-label^='Stop recording']");
    if (btn instanceof HTMLButtonElement) btn.click();
  });
  await page.waitForTimeout(1200);
  const play = page.locator("[data-clip-play='true']");
  if (await play.count()) {
    await play.click({ force: true });
    await page.waitForTimeout(500);
  }
  const playing = (await page.locator("[data-clip-playing='1']").count()) > 0;
  await page.locator("[data-clip-save-always='true']").click();
  await page.waitForTimeout(400);
  await recOnce();
  const askedAgain = await page.locator("[data-clip-ask='1']").count();
  if (askedAgain) throw new Error("asked to save a second time");
  console.log(
    JSON.stringify({
      ok: true,
      askedAtStart: 1,
      compact: compact ? 1 : 0,
      playing: playing ? 1 : 0,
      secondAsk: askedAgain,
      saved: (await page.locator("[data-clip-saved='1']").count()) > 0 ? 1 : 0,
      errors,
    }),
  );
} catch (err) {
  console.log(JSON.stringify({ ok: false, error: String(err), pageErrors: errors }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
