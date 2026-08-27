#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.QA_URL || "http://127.0.0.1:8080";
const out = "/workspace/screenshots";
mkdirSync(out, { recursive: true });

async function liveSession() {
  const r = await fetch(BASE + "/api/live", { cache: "no-store" });
  return (await r.json()).session ?? null;
}

async function waitEval(page, fn, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await page.evaluate(fn)) return;
    await new Promise((r) => setTimeout(r, 120));
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

const errors = [];
function track(page, label) {
  page.on("pageerror", (err) => errors.push(`${label}: ${err.message}`));
}

function snapshot() {
  return {
    intro: Boolean(document.querySelector("[data-voidride-intro='true']")),
    gate: Boolean(document.querySelector("[data-session-gate='open']")),
    pair: Boolean(document.querySelector("[data-pair-overlay='true']")),
    light: Boolean(document.querySelector('button[aria-label="Pair with a larger screen"]')),
    body: (document.body?.innerText || "").slice(0, 180).replace(/\s+/g, " "),
    liveReady: document.querySelector("[data-live-ready]")?.getAttribute("data-live-ready"),
    choice: document.querySelector("[data-session-choice]")?.getAttribute("data-session-choice"),
    holdDone: document.querySelector("[data-hold-done]")?.getAttribute("data-hold-done"),
    viewport: document.querySelector("[data-viewport]")?.getAttribute("data-viewport"),
    vpReady: document.querySelector("[data-vp-ready]")?.getAttribute("data-vp-ready"),
    hasSession: document.querySelector("[data-has-session]")?.getAttribute("data-has-session"),
    showGate: document.querySelector("[data-show-gate]")?.getAttribute("data-show-gate"),
    showPair: document.querySelector("[data-show-pair]")?.getAttribute("data-show-pair"),
  };
}

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const before = await liveSession();
  console.log("roster before", before);

  const mobile = await (
    await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    })
  ).newPage();
  track(mobile, "mobile");
  await mobile.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 15000 });
  await mobile.waitForTimeout(250);

  const early = await mobile.evaluate(snapshot);
  console.log("mobile early", JSON.stringify(early));
  await shot(mobile, "mobile-boot-early.png");

  if (before) {
    await waitEval(mobile, () => document.querySelector("[data-session-gate='open']") != null, 6000);
    if (early.pair) throw new Error("mobile showed pair overlay while a live session exists");
    console.log("mobile gate ok (session already live)");
  } else {
    if (early.gate) {
      throw new Error("mobile showed Watch/Make new with nobody live");
    }
    if (early.pair) {
      throw new Error("mobile auto-opened pairing/QR with nobody live");
    }
    if (!early.intro && !/VOIDRIDE|EMBER RITE|Loading/i.test(early.body)) {
      throw new Error("mobile did not show VOIDRIDE intro");
    }

    await waitEval(
      mobile,
      () =>
        document.querySelector("[data-voidride-intro='true']") == null &&
        document.querySelector("[data-session-gate='open']") == null,
      5000,
    );
    await waitEval(
      mobile,
      () => document.querySelector("[data-session-choice]")?.getAttribute("data-session-choice") !== "pending",
      3000,
    );
  }

  const later = await mobile.evaluate(snapshot);
  console.log("mobile later", JSON.stringify(later));
  await shot(mobile, "mobile-boot-later.png");

  if (!before) {
    if (later.intro) throw new Error("VOIDRIDE intro stuck on mobile");
    if (later.gate) {
      throw new Error("chooser appeared after VOIDRIDE with nobody live");
    }
    if (later.pair) {
      throw new Error("QR/pairing auto-opened after VOIDRIDE on mobile");
    }
    await waitEval(
      mobile,
      () => Boolean(document.querySelector('button[aria-label="Pair with a larger screen"]')),
      4000,
    );

    await mobile.locator('button[aria-label="Pair with a larger screen"]').click({
      timeout: 4000,
      force: true,
      noWaitAfter: true,
    });
    await waitEval(mobile, () => document.querySelector("[data-pair-overlay='true']") != null);
    const pairText = await mobile.evaluate(
      () => document.querySelector("[data-pair-overlay='true']")?.innerText || "",
    );
    console.log("pair card", pairText.slice(0, 160).replace(/\n/g, " | "));
    if (!/Scan the desktop/i.test(pairText)) {
      throw new Error("light tap did not open scan-the-desktop instructions");
    }
    await shot(mobile, "mobile-pair-instructions.png");
    await mobile.locator("[data-pair-overlay='true']").click({ position: { x: 8, y: 8 }, force: true });
    await mobile.waitForTimeout(250);
  }

  const desktop = await (
    await browser.newContext({ viewport: { width: 1280, height: 800 } })
  ).newPage();
  track(desktop, "desktop");
  await desktop.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 15000 });
  await waitEval(
    desktop,
    () => {
      const vp = document.querySelector("[data-viewport]")?.getAttribute("data-viewport");
      const pair = document.querySelector("[data-pair-overlay='true']");
      const gate = document.querySelector("[data-session-gate='open']");
      return vp === "desktop" || Boolean(pair) || Boolean(gate);
    },
    8000,
  );
  await waitEval(
    desktop,
    () =>
      document.querySelector("[data-pair-overlay='true']") != null ||
      document.querySelector("[data-session-gate='open']") != null ||
      document.querySelector("[data-session-choice]")?.getAttribute("data-session-choice") === "host",
    8000,
  );
  const desk = await desktop.evaluate(snapshot);
  console.log("desktop", JSON.stringify(desk));
  await shot(desktop, "desktop-boot.png");
  if (desk.viewport === "mobile" && desk.vpReady === "0") {
    throw new Error("desktop viewport still looks like SSR (matchMedia never applied)");
  }
  if (!desk.gate && !desk.pair && desk.choice !== "host") {
    throw new Error("desktop did not start a host session or pairing card");
  }

  if (errors.length) {
    console.log("page errors", errors);
    throw new Error(errors.join("; "));
  }
  console.log("qa-mobile-boot ok");
} finally {
  await browser.close();
}
