/**
 * Cast protocol – phone (pad) ↔ desktop/wall (host)
 *
 * Messages are small JSON over a WebRTC data channel (P2PRoom).
 * Camera frames are JPEG, base64, at low res for bandwidth.
 * Studio snapshots travel reliably so the pad menu drives the wall.
 */

import type { Splat } from "./pointer";
import type { StudioSnapshot } from "./studio";

export type CastRole = "host" | "pad";

export type CastMsg =
  | { t: "hello"; role: CastRole; worldId?: string; code?: string }
  | { t: "world"; id: string }
  | { t: "feel"; viscosity: number; waveStrength: number; brushDiameter: number }
  | { t: "ptr"; x: number; y: number; down: boolean; id?: number }
  | { t: "splats"; s: Splat[] }
  | { t: "gyro"; alpha: number; beta: number; gamma: number; ang?: 0 | 90 | 180 | 270 }
  | { t: "mic"; level: number; bands?: number[] }
  | { t: "cam"; b64: string }
  | { t: "studio"; snap: StudioSnapshot }
  | { t: "clear" }
  | { t: "rec"; on: boolean }
  | { t: "rec-state"; on: boolean; startedAt: number; limitMs: number }
  | { t: "rec-meta"; name: string; mime: string; n: number; bytes: number }
  | { t: "rec-chunk"; i: number; b64: string }
  | { t: "rec-done" }
  | { t: "rec-skip"; reason: string }
  | { t: "ping"; ts: number }
  | { t: "pong"; ts: number }
  | { t: "bye" };

export const CAST_CHANNEL = "ripple-cast";

/** 6-char room code shown in QR / typed on pad */
export function makeCastCode(): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 6; i++) out += alphabet[arr[i]! % alphabet.length];
  return out;
}

export function roomIdFor(code: string): string {
  return `ripple-${code.trim().toUpperCase()}`;
}

export function parseCastMsg(raw: unknown): CastMsg | null {
  if (typeof raw === "string") {
    try {
      const m = JSON.parse(raw) as unknown;
      if (m && typeof m === "object" && "t" in m && typeof (m as CastMsg).t === "string") {
        return m as CastMsg;
      }
    } catch {
      return null;
    }
    return null;
  }
  if (raw && typeof raw === "object" && "t" in raw && typeof (raw as CastMsg).t === "string") {
    return raw as CastMsg;
  }
  return null;
}

export function encodeCamB64(jpeg: ArrayBuffer): string {
  const bytes = new Uint8Array(jpeg);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function decodeCamB64(b64: string): ArrayBuffer | null {
  try {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out.buffer;
  } catch {
    return null;
  }
}
