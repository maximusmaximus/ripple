/**
 * Cast protocol – phone (pad) ↔ desktop/wall (host)
 *
 * Messages are small JSON over a single WebRTC data channel.
 * Camera frames are JPEG binary (type-prefixed) at low res for bandwidth.
 */

export type CastRole = 'host' | 'pad'

export type CastMsg =
  | { t: 'hello'; role: CastRole; worldId?: string; code?: string }
  | { t: 'world'; id: string }
  | { t: 'ptr'; x: number; y: number; down: boolean; id?: number }
  | { t: 'gyro'; alpha: number; beta: number; gamma: number }
  | { t: 'mic'; level: number; bands?: number[] }
  | { t: 'ping'; ts: number }
  | { t: 'pong'; ts: number }
  | { t: 'bye' }

export const CAST_CHANNEL = 'ripple-cast'

/** 6-char room code shown in QR / typed on pad */
export function makeCastCode(): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let out = ''
  const arr = new Uint8Array(6)
  crypto.getRandomValues(arr)
  for (let i = 0; i < 6; i++) out += alphabet[arr[i]! % alphabet.length]
  return out
}

export function roomIdFor(code: string): string {
  return `ripple-${code.trim().toUpperCase()}`
}

export function parseCastMsg(raw: string): CastMsg | null {
  try {
    const m = JSON.parse(raw)
    if (m && typeof m.t === 'string') return m as CastMsg
  } catch {
    /* ignore */
  }
  return null
}

/** Binary camera frame: [0x01][jpeg bytes] */
export const CAM_FRAME_MAGIC = 0x01

export function encodeCamFrame(jpeg: ArrayBuffer): ArrayBuffer {
  const out = new Uint8Array(1 + jpeg.byteLength)
  out[0] = CAM_FRAME_MAGIC
  out.set(new Uint8Array(jpeg), 1)
  return out.buffer
}

export function decodeCamFrame(buf: ArrayBuffer): ArrayBuffer | null {
  const u = new Uint8Array(buf)
  if (u.length < 2 || u[0] !== CAM_FRAME_MAGIC) return null
  return u.buffer.slice(1)
}
