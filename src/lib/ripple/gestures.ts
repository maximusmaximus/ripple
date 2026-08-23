/**
 * Paint vs navigation classifier.
 *
 * Rule used here:
 *  - While the finger is down and moving, ALWAYS paint.
 *  - Only evaluate navigation on pointer/touch **up**.
 *  - Navigate only if the stroke was a quick flick (short duration, high speed,
 *    mostly axis-aligned) AND the painted distance stayed small.
 *  - If the user doodled (longer contact or significant path length) → paint wins.
 */

export type SwipeDir = 'left' | 'right' | 'up' | 'down' | null

export type StrokeStats = {
  startX: number
  startY: number
  endX: number
  endY: number
  startT: number
  endT: number
  pathLen: number
  samples: number
}

const NAV_MAX_DURATION_MS = 420
const NAV_MIN_SPEED = 1.8
const NAV_MAX_PATH = 0.55
const NAV_AXIS_RATIO = 1.6

export function createStrokeTracker() {
  let stats: StrokeStats | null = null

  return {
    down(x: number, y: number, t: number) {
      stats = {
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        startT: t,
        endT: t,
        pathLen: 0,
        samples: 1,
      }
    },
    move(x: number, y: number, t: number) {
      if (!stats) return
      const dx = x - stats.endX
      const dy = y - stats.endY
      stats.pathLen += Math.hypot(dx, dy)
      stats.endX = x
      stats.endY = y
      stats.endT = t
      stats.samples++
    },
    up(): SwipeDir {
      if (!stats) return null
      const s = stats
      stats = null

      const dt = Math.max(1, s.endT - s.startT)
      const dx = s.endX - s.startX
      const dy = s.endY - s.startY
      const dist = Math.hypot(dx, dy)
      const speed = dist / (dt / 1000)

      if (s.pathLen > NAV_MAX_PATH || s.samples > 24) return null
      if (dt > NAV_MAX_DURATION_MS) return null
      if (speed < NAV_MIN_SPEED) return null
      if (dist < 0.08) return null

      const ax = Math.abs(dx)
      const ay = Math.abs(dy)
      if (ax > ay * NAV_AXIS_RATIO) return dx > 0 ? 'right' : 'left'
      if (ay > ax * NAV_AXIS_RATIO) return dy > 0 ? 'down' : 'up'
      return null
    },
    cancel() {
      stats = null
    },
  }
}
