#!/usr/bin/env node
/**
 * Phone → desktop pairing diagnostic (no request intercept).
 */
import { chromium } from "playwright";

const BASE = process.env.QA_URL || "http://127.0.0.1:8080";
const log = (x) => console.log(typeof x === "string" ? x : JSON.stringify(x));

const ICE_INIT = `(() => {
  const Orig = window.RTCPeerConnection;
  if (!Orig || Orig.__rippleDiag) return;
  const bag = [];
  window.__rippleIce = bag;
  class Wrap extends Orig {
    constructor(cfg) {
      super(cfg);
      const id = Math.random().toString(36).slice(2, 6);
      bag.push({ id, t: "new", cfg, at: Date.now() });
      this.addEventListener("connectionstatechange", () => {
        bag.push({ id, t: "pc", v: this.connectionState, at: Date.now() });
      });
      this.addEventListener("iceconnectionstatechange", () => {
        bag.push({ id, t: "ice", v: this.iceConnectionState, at: Date.now() });
      });
      this.addEventListener("icegatheringstatechange", () => {
        bag.push({ id, t: "gather", v: this.iceGatheringState, at: Date.now() });
      });
      this.addEventListener("icecandidate", (e) => {
        const c = e.candidate && e.candidate.candidate;
        bag.push({ id, t: "cand", v: c ? c.slice(0, 120) : "end", at: Date.now() });
      });
    }
  }
  Wrap.__rippleDiag = true;
  window.RTCPeerConnection = Wrap;
})();`;

async function rtcRoom(code) {
  const room = `ripple-${code}`;
  const r = await fetch(`${BASE}/api/rtc?room=${room}&peer=zdiag0001&name=diag&since=0`);
  return r.json();
}

async function waitHoldDone(page) {
  await page.waitForSelector("[data-hold-done='1'], [data-pair-overlay='true']", { timeout: 16000 }).catch(() => {});
  if (await page.locator("[data-pair-overlay='true']").count()) {
    await page.waitForSelector("[data-pair-hold='0']", { timeout: 14000 }).catch(() => {});
  }
}

async function hostSnap(page) {
  return page.evaluate(() => {
    const root = document.querySelector("[data-cast-state]");
    const overlay = document.querySelector("[data-pair-overlay='true']");
    const mono = overlay?.querySelector(".font-mono");
    return {
      castState: root?.getAttribute("data-cast-state"),
      castLive: root?.getAttribute("data-cast-live"),
      castCode: root?.getAttribute("data-cast-code"),
      liveCode: root?.getAttribute("data-live-code"),
      pairHold: overlay?.getAttribute("data-pair-hold"),
      pairLocal: Boolean(overlay?.querySelector("[data-pair-local='true']")),
      hasQr: Boolean(overlay?.querySelector("canvas")),
      monoCode: (mono?.textContent || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
      ice: window.__rippleIce || [],
    };
  });
}

async function padSnap(page) {
  return page.evaluate(() => {
    const pad = document.querySelector("[data-pad='true']");
    const btn = [...document.querySelectorAll("button")].find((b) =>
      /Take control|Connecting|Looking|Reconnect|Retry/i.test(b.textContent || ""),
    );
    return {
      hasPad: Boolean(pad),
      title: document.querySelector("h1")?.textContent || "",
      btn: btn?.textContent || "",
      ice: window.__rippleIce || [],
    };
  });
}

const errors = [];
function track(page, label) {
  page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`${label} console: ${msg.text()}`);
  });
}

const extra = process.argv.includes("--mdns-off")
  ? ["--disable-features=WebRtcHideLocalIpsWithMdns"]
  : [];

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", ...extra],
});

try {
  log({ mdnsOff: extra.length > 0 });

  const hostCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const host = await hostCtx.newPage();
  track(host, "host");
  await host.addInitScript(ICE_INIT);
  await host.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 25000 });
  await waitHoldDone(host);
  await host.waitForTimeout(500);
  const h0 = await hostSnap(host);
  const code = h0.monoCode || h0.castCode || h0.liveCode;
  log({ host0: { ...h0, ice: h0.ice.length }, code });
  if (!code || code.length < 4) throw new Error("no host code");
  if (!h0.pairLocal) throw new Error("loopback wall should hide the QR and show the phone code");
  if (h0.hasQr) throw new Error("loopback wall still painted a QR");

  let hostRtc = 0;
  host.on("request", (req) => {
    if (req.url().includes("/api/rtc")) hostRtc += 1;
  });

  const padCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const pad = await padCtx.newPage();
  track(pad, "pad");
  await pad.addInitScript(ICE_INIT);
  await pad.goto(`${BASE}/?mode=pad&c=${encodeURIComponent(code)}`, {
    waitUntil: "domcontentloaded",
    timeout: 25000,
  });

  let liveAt = null;
  for (let i = 0; i < 16; i++) {
    await pad.waitForTimeout(1000);
    const [h, p] = await Promise.all([hostSnap(host), padSnap(pad)]);
    const row = {
      s: i + 1,
      host: h.castState,
      live: h.castLive,
      padBtn: p.btn,
      hasPad: p.hasPad,
      hostRtc,
      hostIce: h.ice.map((e) => e.t + ":" + (e.v || "")).slice(-4),
      padIce: p.ice.map((e) => e.t + ":" + (e.v || "")).slice(-4),
    };
    log(row);
    if (p.hasPad && h.castLive === "true") {
      liveAt = i + 1;
      break;
    }
  }

  const [hEnd, pEnd] = await Promise.all([hostSnap(host), padSnap(pad)]);
  log({
    liveAt,
    hostIceAll: hEnd.ice,
    padIceAll: pEnd.ice,
  });
  if (!liveAt || liveAt > 3) {
    throw new Error(`pairing did not go live quickly (liveAt=${liveAt})`);
  }

  // Raw two-page datachannel
  const rawInit = ICE_INIT;
  const aCtx = await browser.newContext();
  const bCtx = await browser.newContext();
  const pa = await aCtx.newPage();
  const pb = await bCtx.newPage();
  await pa.addInitScript(rawInit);
  await pb.addInitScript(rawInit);
  await pa.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await pb.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const webrtc = (page, role, peerId, otherId, initiator) =>
    page.evaluate(
      async ({ role, peerId, otherId, initiator }) => {
        const room = "ripple-RAWICE";
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"] }],
        });
        let dcOpen = false;
        if (initiator) {
          pc.createDataChannel("reliable", { ordered: true }).onopen = () => {
            dcOpen = true;
          };
        } else {
          pc.ondatachannel = (e) => {
            e.channel.onopen = () => {
              dcOpen = true;
            };
          };
        }
        pc.onicecandidate = (e) => {
          if (!e.candidate) return;
          void fetch("/api/rtc", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              op: "signal",
              room,
              from: peerId,
              to: otherId,
              kind: "ice",
              payload: e.candidate.toJSON(),
            }),
          });
        };
        const poll = async (since) => {
          const r = await fetch(`/api/rtc?room=${room}&peer=${peerId}&name=${role}&since=${since}`);
          return r.json();
        };
        let since = 0;
        await poll(0);
        if (initiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await fetch("/api/rtc", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              op: "signal",
              room,
              from: peerId,
              to: otherId,
              kind: "offer",
              payload: pc.localDescription.toJSON(),
            }),
          });
        }
        const start = Date.now();
        while (Date.now() - start < 7000) {
          const body = await poll(since);
          for (const s of body.signals || []) {
            since = Math.max(since, s.id);
            if (s.kind === "offer") {
              await pc.setRemoteDescription(s.payload);
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await fetch("/api/rtc", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  op: "signal",
                  room,
                  from: peerId,
                  to: otherId,
                  kind: "answer",
                  payload: pc.localDescription.toJSON(),
                }),
              });
            } else if (s.kind === "answer") {
              await pc.setRemoteDescription(s.payload);
            } else if (s.kind === "ice") {
              try {
                await pc.addIceCandidate(s.payload);
              } catch {
                /* ignore */
              }
            }
          }
          if (pc.connectionState === "connected" && dcOpen) break;
          await new Promise((r) => setTimeout(r, 200));
        }
        return {
          role,
          pc: pc.connectionState,
          ice: pc.iceConnectionState,
          dcOpen,
          iceLog: window.__rippleIce || [],
        };
      },
      { role, peerId, otherId, initiator },
    );
  const [rawA, rawB] = await Promise.all([
    webrtc(pa, "wall", "wwallraw1", "ppadraw01", true),
    webrtc(pb, "pad", "ppadraw01", "wwallraw1", false),
  ]);
  log({ rawA: { ...rawA, iceLog: rawA.iceLog }, rawB: { ...rawB, iceLog: rawB.iceLog } });
} catch (err) {
  log({ fatal: String(err && err.stack ? err.stack : err) });
} finally {
  await browser.close();
}
log({ errors });
log({ done: true });
