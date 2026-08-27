import { decodeCamB64, encodeCamB64, type CastMsg } from "./cast";

export const REC_MAX_SHARE_BYTES = 8 * 1024 * 1024;
const CHUNK = 10_000;

/** Share = today's portable clip. lanHd = wall-local, same-network only. */
export type RecordProfile = "share" | "lanHd";

const LAN_HOST_RTT_MS = 40;
const LAN_PRFLX_RTT_MS = 20;

/** ICE host (or a very-local prflx) + quiet RTT. Watchers are ignored by the caller. */
export function isLanPeer(p: {
  candidateType: string | null;
  rttMs: number | null;
  connectionState?: string;
}): boolean {
  if (p.connectionState && p.connectionState !== "connected") return false;
  const t = p.candidateType;
  if (t === "host") return p.rttMs == null || p.rttMs <= LAN_HOST_RTT_MS;
  if (t === "prflx") return p.rttMs != null && p.rttMs <= LAN_PRFLX_RTT_MS;
  return false;
}

export function recordProfileFor(lanHd: boolean): RecordProfile {
  if (!lanHd || typeof navigator === "undefined") return "share";
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  if (mem <= 2) return "share";
  return "lanHd";
}

export function pickRecordMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const types = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t));
}

export function recordFps(profile: RecordProfile = "share"): number {
  if (typeof window === "undefined") return 15;
  if (profile === "lanHd") {
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
    return mem >= 8 ? 30 : 24;
  }
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  if (coarse || mem <= 2) return 12;
  if (mem <= 4) return 16;
  return 20;
}

export function recordBitrate(profile: RecordProfile, canvas?: HTMLCanvasElement | null): number {
  if (profile !== "lanHd") return 1_200_000;
  const w = canvas?.width ?? 1280;
  const h = canvas?.height ?? 720;
  const bits = Math.round(w * h * 30 * 0.14);
  return Math.min(12_000_000, Math.max(6_000_000, bits));
}

export function recordLimitMs(profile: RecordProfile = "share"): number {
  return profile === "lanHd" ? 60_000 : 30_000;
}

export function recFileName(mime: string, profile: RecordProfile = "share"): string {
  const ext = mime.includes("mp4") ? "mp4" : "webm";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const tag = profile === "lanHd" ? "hd-" : "";
  return `ripple-${tag}${stamp}.${ext}`;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export type PendingClip = { url: string; name: string };

export function offerDownload(blob: Blob, name: string): PendingClip {
  const url = URL.createObjectURL(blob);
  const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  if (!coarse) {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  return { url, name };
}

export function savePendingClip(clip: PendingClip) {
  const a = document.createElement("a");
  a.href = clip.url;
  a.download = clip.name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function sendRecBlob(
  send: (msg: CastMsg) => void,
  blob: Blob,
  name: string,
): Promise<"sent" | "skip"> {
  if (blob.size > REC_MAX_SHARE_BYTES) {
    send({ t: "rec-skip", reason: "too-large" });
    return "skip";
  }
  const buf = new Uint8Array(await blob.arrayBuffer());
  const mime = blob.type || "video/webm";
  const n = Math.max(1, Math.ceil(buf.length / CHUNK));
  send({ t: "rec-meta", name, mime, n, bytes: buf.length });
  for (let i = 0; i < n; i++) {
    const slice = buf.subarray(i * CHUNK, (i + 1) * CHUNK);
    const copy = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
    send({ t: "rec-chunk", i, b64: encodeCamB64(copy) });
    if (i % 6 === 5) await new Promise((r) => window.setTimeout(r, 16));
  }
  send({ t: "rec-done" });
  return "sent";
}

export function createRecInbox() {
  let name = "ripple.webm";
  let mime = "video/webm";
  let n = 0;
  const parts = new Map<number, Uint8Array>();
  return {
    reset(meta: { name: string; mime: string; n: number }) {
      name = meta.name;
      mime = meta.mime;
      n = meta.n;
      parts.clear();
    },
    add(i: number, b64: string) {
      const raw = decodeCamB64(b64);
      if (raw) parts.set(i, new Uint8Array(raw));
    },
    assemble(): { blob: Blob; name: string } | null {
      if (!n || parts.size < n) return null;
      const ordered: Uint8Array[] = [];
      let total = 0;
      for (let i = 0; i < n; i++) {
        const p = parts.get(i);
        if (!p) return null;
        ordered.push(p);
        total += p.byteLength;
      }
      const out = new Uint8Array(total);
      let offset = 0;
      for (const p of ordered) {
        out.set(p, offset);
        offset += p.byteLength;
      }
      parts.clear();
      return { blob: new Blob([out], { type: mime }), name };
    },
  };
}
