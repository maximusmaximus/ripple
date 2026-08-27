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

async function waitForHost(timeoutMs = 10000) {
  const start = Date.now();
  let hits = 0;
  while (Date.now() - start < timeoutMs) {
    const session = await liveSession();
    if (session?.code) {
      hits += 1;
      if (hits >= 2) return session;
    } else hits = 0;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("public LIVE host never appeared");
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
    await page.screenshot({ path: `${out}/${name}`, timeout: 4000 });
  } catch (err) {
    console.log("screenshot failed", name, String(err.message || err));
  }
}

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
console.log("launched");

try {
  const hostPage = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  track(hostPage, "host");
  await hostPage.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 15000 });
  console.log("host loaded");
  const session = await waitForHost();
  console.log("host claimed", session.code);
  await shot(hostPage, "live-host.png");

  const guestPage = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  track(guestPage, "guest");
  await guestPage.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 15000 });
  await waitEval(guestPage, () => document.querySelector("[data-show-gate='1']") != null);
  const gateText = await guestPage.evaluate(
    () => document.querySelector("[data-session-gate='open']")?.innerText || "",
  );
  console.log("gate ok", gateText.slice(0, 80).replace(/\n/g, " | "));
  await shot(guestPage, "live-gate.png");

  await guestPage.goto(`${BASE}/?mode=watch&c=${encodeURIComponent(session.code)}`, {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  });
  await waitEval(guestPage, () => document.querySelector("[data-watch='true']") != null, 8000);
  await shot(guestPage, "live-watch.png");
  const watchState = await guestPage.evaluate(
    () => document.querySelector("[data-watch='true']")?.getAttribute("data-watch-state") || "",
  );
  const watchOthers = await guestPage.evaluate(
    () => document.querySelector("[data-live-viewers]")?.getAttribute("data-live-viewers") || null,
  );

  await hostPage.waitForTimeout(2500);
  const hostViewers = await hostPage.evaluate(
    () => document.querySelector("[data-live-viewers]")?.getAttribute("data-live-viewers") || null,
  );
  await shot(hostPage, "live-host-with-viewer.png");

  const privatePage = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  track(privatePage, "private");
  await privatePage.addInitScript(() => sessionStorage.setItem("ripple-private-session", "1"));
  await privatePage.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 15000 });
  await privatePage.waitForTimeout(800);
  const privateChoice = await privatePage.evaluate(
    () => document.querySelector("[data-session-choice]")?.getAttribute("data-session-choice") || "",
  );
  const stillGated = await privatePage.evaluate(
    () => document.querySelectorAll("[data-session-gate='open']").length,
  );
  await shot(privatePage, "live-private.png");

  const report = {
    hostCode: session.code,
    gateText: gateText.slice(0, 280),
    watchState,
    watchOthers,
    hostViewers,
    privateChoice,
    stillGated,
    live: await liveSession(),
    errors,
  };
  console.log(JSON.stringify(report, null, 2));
  const ok =
    /Watch LIVE/i.test(gateText) &&
    /Make new session/i.test(gateText) &&
    stillGated === 0 &&
    privateChoice === "private" &&
    errors.length === 0;
  process.exit(ok ? 0 : 1);
} finally {
  await browser.close();
}
