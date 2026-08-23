/**
 * Lightweight signaling for cast rooms.
 * In production this hits /api/rtc; here we keep a pure client-side
 * in-memory + BroadcastChannel fallback so local preview works without a server.
 */

export type SignalMsg = {
  room: string
  from: string
  to?: string
  type: 'offer' | 'answer' | 'candidate' | 'leave' | 'hello'
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  ts?: number
}

type Listener = (msg: SignalMsg) => void

const channels = new Map<string, BroadcastChannel>()

function ch(room: string): BroadcastChannel {
  let c = channels.get(room)
  if (!c) {
    c = new BroadcastChannel(`ripple-signal-${room}`)
    channels.set(room, c)
  }
  return c
}

export function postSignal(msg: SignalMsg): void {
  msg.ts = Date.now()
  try {
    ch(msg.room).postMessage(msg)
  } catch {
    /* ignore */
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    fetch('/api/rtc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
      keepalive: true,
    }).catch(() => {})
  }
}

export function subscribeSignal(room: string, peerId: string, onMsg: Listener): () => void {
  const bc = ch(room)
  const handler = (ev: MessageEvent) => {
    const m = ev.data as SignalMsg
    if (!m || m.room !== room) return
    if (m.from === peerId) return
    if (m.to && m.to !== peerId) return
    onMsg(m)
  }
  bc.addEventListener('message', handler)

  let stopped = false
  let timer: ReturnType<typeof setTimeout> | null = null

  async function poll() {
    if (stopped) return
    try {
      const res = await fetch(
        `/api/rtc?room=${encodeURIComponent(room)}&peer=${encodeURIComponent(peerId)}`,
        { signal: AbortSignal.timeout(25_000) },
      )
      if (res.ok) {
        const list = (await res.json()) as SignalMsg[]
        for (const m of list) {
          if (m.from !== peerId) onMsg(m)
        }
      }
    } catch {
      /* timeout or network – retry */
    }
    if (!stopped) timer = setTimeout(poll, 400)
  }
  if (typeof window !== 'undefined') poll()

  return () => {
    stopped = true
    if (timer) clearTimeout(timer)
    bc.removeEventListener('message', handler)
  }
}

export function makePeerId(): string {
  return `p-${Math.random().toString(36).slice(2, 10)}`
}
