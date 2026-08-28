#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.QA_URL || "http://127.0.0.1:8080";
const out = "/workspace/screenshots";
mkdirSync(out, { recursive: true });
console.log("qa start");

const errors = [];
function track(page, label) {
  page.on("pageerror", (err) => errors.push(`${label}: ${err.message}`));
}

async function liveSession() {
  const r = await fetch(BASE + "/api/live", { cache: "no-store" });
  return (await r.json()).session ?? null;
}

async function waitEval(page, fn, timeoutMs = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await page.evaluate(fn)) return;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error("waitEval timed out");
}

async function shot(page, name) {
  try {
    await page.screenshot({ path: `${out}/${name}`, timeout: 1500, animations: "disabled" });
  } catch (err) {
    console.log("screenshot failed", name, String(err.message || err));
  }
}

async function dismissPair(page) {
  await page.waitForFunction(
    () => document.querySelector("[data-pair-overlay='true']")?.getAttribute("data-pair-hold") === "0",
    null,
    { timeout: 10000 },
  );
  await page.evaluate(() => {
    const backdrop = document.querySelector("[data-pair-overlay='true'] [aria-hidden]");
    backdrop?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
  });
  await page.waitForFunction(() => !document.querySelector("[data-pair-overlay='true']"), null, {
    timeout: 6000,
  });
}

async function ensureMenu(page) {
  const open = await page.evaluate(() => {
    const share = document.querySelector("[data-session-share='true']");
    if (!share) return false;
    const wrap = share.closest("[data-ui-chrome]")?.parentElement;
    return Boolean(wrap && getComputedStyle(wrap).opacity !== "0");
  });
  if (!open) {
    await page.getByRole("button", { name: "Show menu" }).click({ force: true });
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => {
    document.querySelector(".controls-dock-scroll")?.scrollTo({ top: 8000 });
  });
  await page.waitForTimeout(200);
}

async function openMenu(page) {
  await page.getByRole("button", { name: "Show menu" }).click();
  await waitEval(
    page,
    () => {
      const share = document.querySelector("[data-session-share='true']");
      if (!share) return false;
      const dock = share.closest("[data-ui-chrome]");
      return Boolean(dock && dock.parentElement && getComputedStyle(dock.parentElement).opacity !== "0");
    },
    8000,
  );
  await page.evaluate(() => {
    document.querySelector(".controls-dock-scroll")?.scrollTo({ top: 4000 });
  });
  await page.waitForTimeout(200);
}

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
console.log("launched");

try {
  const drop = await (await fetch(BASE + "/api/voidride", { cache: "no-store" })).json();
  console.log("voidride", drop.album, drop.title, drop.url);

  const hostPage = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  track(hostPage, "host");
  await hostPage.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 15000 });
  await hostPage.waitForTimeout(400);
  const splashOnBoot = await hostPage.evaluate(() => document.querySelectorAll(".ripple-splash").length);
  console.log("splash nodes", splashOnBoot);
  await hostPage.waitForFunction(() => document.querySelector(".voidride-hold"), null, { timeout: 5000 }).catch(() => {});
  const holdText = await hostPage.evaluate(() => document.querySelector(".voidride-hold")?.innerText || "");
  console.log("hold", holdText.slice(0, 160).replace(/\n/g, " | "));
  await shot(hostPage, "live-boot.png");

  await dismissPair(hostPage);
  await ensureMenu(hostPage);
  await hostPage.getByPlaceholder("Name this mix").fill("Night paper");
  await hostPage.getByPlaceholder("What are you painting").fill("Fluid waves for the wall");
  await waitEval(hostPage, () => document.querySelector("[data-watch-share='open']") != null, 6000);
  const shareText = await hostPage.evaluate(
    () => document.querySelector("[data-watch-share='open']")?.innerText || "",
  );
  console.log("share popup", shareText.slice(0, 120).replace(/\n/g, " | "));
  await shot(hostPage, "live-share.png");
  const listBtn = hostPage.getByRole("button", { name: "List this mix" });
  if (await listBtn.count()) await listBtn.click();
  else await hostPage.getByRole("switch", { name: "Watchable" }).click();
  await hostPage.getByRole("button", { name: "Close" }).click();

  const listed = await liveSession();
  console.log("listed", listed);
  if (!listed?.code) throw new Error("watchable session never listed");
  await shot(hostPage, "live-host.png");

  const guestPage = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  track(guestPage, "guest");
  await guestPage.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 15000 });
  await waitEval(guestPage, () => document.querySelector("[data-show-gate='1']") != null, 16000);
  const gateText = await guestPage.evaluate(
    () => document.querySelector("[data-session-gate='open']")?.innerText || "",
  );
  console.log("gate ok", gateText.slice(0, 160).replace(/\n/g, " | "));
  await shot(guestPage, "live-gate.png");

  await guestPage.goto(`${BASE}/?mode=watch&c=${encodeURIComponent(listed.code)}`, {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  });
  await waitEval(guestPage, () => document.querySelector("[data-watch='true']") != null, 8000);
  await shot(guestPage, "live-watch.png");
  const watchState = await guestPage.evaluate(
    () => document.querySelector("[data-watch='true']")?.getAttribute("data-watch-state") || "",
  );

  const privatePage = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  track(privatePage, "private");
  await privatePage.addInitScript(() => sessionStorage.setItem("ripple-private-session", "1"));
  await privatePage.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 15000 });
  await waitEval(
    privatePage,
    () => document.querySelector("[data-session-choice]")?.getAttribute("data-session-choice") === "private",
    14000,
  ).catch(() => {});
  const privateChoice = await privatePage.evaluate(
    () => document.querySelector("[data-session-choice]")?.getAttribute("data-session-choice") || "",
  );
  const stillGated = await privatePage.evaluate(
    () => document.querySelectorAll("[data-session-gate='open']").length,
  );
  const privateSplash = await privatePage.evaluate(() => document.querySelectorAll(".ripple-splash").length);
  await shot(privatePage, "live-private.png");

  const report = {
    drop,
    splashOnBoot,
    holdText: holdText.slice(0, 280),
    shareText: shareText.slice(0, 280),
    hostCode: listed.code,
    gateText: gateText.slice(0, 280),
    watchState,
    privateChoice,
    stillGated,
    privateSplash,
    live: await liveSession(),
    errors,
  };
  console.log(JSON.stringify(report, null, 2));
  const ok =
    splashOnBoot === 0 &&
    privateSplash === 0 &&
    /MARS DESCENT/i.test(drop.album) &&
    /IGNITION VEIL/i.test(drop.title) &&
    /Night paper/i.test(gateText) &&
    /Fluid waves/i.test(gateText) &&
    /Watch/i.test(gateText) &&
    /Make new session/i.test(gateText) &&
    /Copy link/i.test(shareText) &&
    stillGated === 0 &&
    privateChoice === "private" &&
    errors.length === 0;
  try {
    if (listed?.hostPeer) {
      await fetch(BASE + "/api/live", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "leave", peer: listed.hostPeer }),
      });
    }
  } catch {
    /* ignore */
  }
  process.exit(ok ? 0 : 1);
} finally {
  await browser.close();
}
