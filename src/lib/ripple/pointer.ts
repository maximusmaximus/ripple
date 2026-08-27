import type { BrushFeel, BrushKind } from "./brushes"

export type Splat = { x: number; y: number; force: number; radius: number; angle?: number; width?: number; stamp?: boolean }
type Track = { x: number; y: number; down: boolean; t: number; w: number; heading: number; rot: number; path: number }

const MAX_SPLATS_PER_MOVE = 128
const MIN_STEP = 0.002

export type StrokeInput = { pressure?: number }

export class PointerPainter {
  private tracks = new Map<number, Track>()
  private queue: Splat[] = []
  private minR = 0.012
  private maxR = 0.03
  private midR = 0.02
  private radius = 0.03
  private force = 0.7
  private kind: BrushKind = "round"
  private feel: BrushFeel = "steady"
  private nib = Math.PI / 4
  private spread = 1.8
  private grains = 4
  private stampAngle = 0
  private stampSpin = 0
  private markWidth = 1

  setBrush(
    startRadius: number,
    midRadius: number,
    endRadius: number,
    force: number,
    kind: BrushKind = "round",
    spread = 1.8,
    grains = 4,
    feel: BrushFeel = "steady",
    nib = Math.PI / 4,
    stampAngle = 0,
    stampSpin = 0,
    markWidth = 1,
  ) {
    const start = Math.max(0.003, Math.min(0.08, startRadius))
    const end = Math.max(0.003, Math.min(0.08, endRadius))
    const mid = Math.max(0.003, Math.min(0.08, midRadius))
    this.maxR = start
    this.midR = mid
    this.minR = end
    this.radius = this.maxR
    this.force = Math.max(0.18, force)
    this.kind = kind
    this.spread = Math.max(0.3, spread)
    this.grains = Math.max(2, Math.min(10, Math.round(grains)))
    this.feel = feel
    this.nib = nib
    this.stampAngle = stampAngle
    this.stampSpin = Math.max(0, stampSpin)
    this.markWidth = Math.max(0.18, Math.min(1, markWidth))
  }

  down(id: number, x: number, y: number, t = performance.now(), input: StrokeInput = {}) {
    const w = this.dynT(0, input.pressure ?? 0.5, 0, t, 0)
    const rot = (this.stampAngle * Math.PI) / 180
    this.tracks.set(id, { x, y, down: true, t, w, heading: this.nib, rot, path: 0 })
    this.emit(x, y, this.force, w, this.nib, rot)
  }

  move(id: number, x: number, y: number, t = performance.now(), input: StrokeInput = {}) {
    const last = this.tracks.get(id)
    if (!last || !last.down) return

    const dx = x - last.x
    const dy = y - last.y
    const dist = Math.hypot(dx, dy)
    const dt = Math.max(1, t - last.t)
    const speed = dist / dt
    const heading = dist > 1e-6 ? Math.atan2(dy, dx) : last.heading
    const path = last.path + dist
    const target = this.dynT(speed, input.pressure ?? 0.5, heading, t, path)
    const w = last.w * 0.55 + target * 0.45
    const rot = last.rot + this.stampSpin * dist * 10

    if (dist < 1e-7) {
      this.emit(x, y, this.force * 0.55, w * 0.9, heading, rot)
      this.tracks.set(id, { x, y, down: true, t, w, heading, rot, path })
      return
    }

    const step =
      this.kind === "stamp"
        ? Math.max(this.maxR * 0.38, MIN_STEP * 4)
        : this.kind === "scatter"
          ? MIN_STEP * 1.6
          : MIN_STEP
    const steps = Math.max(1, Math.ceil(dist / step))
    const useSteps = Math.min(MAX_SPLATS_PER_MOVE, steps)
    const inv = 1 / useSteps

    for (let i = 1; i <= useSteps; i++) {
      const u = i * inv
      const ww = last.w + (w - last.w) * u
      const rr = last.rot + (rot - last.rot) * u
      this.emit(last.x + dx * u, last.y + dy * u, this.force, ww, heading, rr)
    }
    this.tracks.set(id, { x, y, down: true, t, w, heading, rot, path })
  }

  up(id: number, x?: number, y?: number) {
    const last = this.tracks.get(id)
    if (last?.down && x != null && y != null) this.move(id, x, y)
    this.tracks.delete(id)
  }

  drain(): Splat[] {
    if (this.queue.length === 0) return this.queue
    const out = this.queue
    this.queue = []
    return out
  }

  get isDown() {
    for (const t of this.tracks.values()) if (t.down) return true
    return false
  }

  reset() {
    this.tracks.clear()
    this.queue.length = 0
  }

  /** Radius along the stroke from the start / belly / end profile. */
  private dynT(speed: number, pressure: number, heading: number, t: number, path: number): number {
    const p = pressure > 0.02 ? Math.max(0.08, Math.min(1, pressure)) : 0.55
    let feel = 1
    switch (this.feel) {
      case "press":
        feel = 0.55 + 0.45 * p
        break
      case "taper":
        feel = 1 - clamp01(speed / 0.012) * 0.35
        break
      case "swell":
        feel = 0.7 + 0.3 * clamp01(speed / 0.01)
        break
      case "nib":
        feel = 0.55 + 0.45 * Math.abs(Math.sin(heading - this.nib))
        break
      case "pulse":
        feel = 0.75 + 0.25 * Math.sin(t * 0.014)
        break
      default:
        feel = 1
    }
    const u = clamp01(1 - Math.exp(-path / 0.14))
    const env = u < 0.5 ? mix(this.maxR, this.midR, u * 2) : mix(this.midR, this.minR, (u - 0.5) * 2)
    return Math.max(0.003, env * feel)
  }

  private emit(x: number, y: number, force: number, scale: number, heading: number, rot = 0) {
    const r = Math.max(0.003, scale)
    if (this.kind === "stamp") {
      this.queue.push({
        x: clamp01(x),
        y: clamp01(y),
        force,
        radius: r,
        angle: rot,
        width: this.markWidth,
        stamp: true,
      })
      return
    }
    if (this.kind === "scatter") {
      const n = this.grains
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2
        const rad = Math.random() * this.radius * this.spread
        this.queue.push({
          x: clamp01(x + Math.cos(ang) * rad),
          y: clamp01(y + Math.sin(ang) * rad),
          force: force * (0.35 + Math.random() * 0.45),
          radius: r * (0.28 + Math.random() * 0.45),
          angle: rot,
          width: this.markWidth,
        })
      }
      return
    }
    if (this.kind === "soft") {
      this.queue.push({ x, y, force: force * 0.55, radius: r * 1.55, angle: rot, width: this.markWidth })
      this.queue.push({ x, y, force: force * 0.85, radius: r * 0.7, angle: rot, width: this.markWidth })
      return
    }
    if (this.kind === "nib") {
      const nx = -Math.sin(heading)
      const ny = Math.cos(heading)
      const half = r * 0.95
      const dabs = 5
      for (let i = 0; i < dabs; i++) {
        const u = (i / (dabs - 1)) * 2 - 1
        this.queue.push({
          x: clamp01(x + nx * half * u),
          y: clamp01(y + ny * half * u),
          force: force * (0.7 + (1 - Math.abs(u)) * 0.35),
          radius: r * (0.32 + (1 - Math.abs(u)) * 0.28),
          angle: rot,
          width: this.markWidth,
        })
      }
      return
    }
    this.queue.push({ x, y, force, radius: r, angle: rot, width: this.markWidth })
  }
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function eventFromChrome(e: Event): boolean {
  const t = e.target
  if (!(t instanceof Element)) return false
  return Boolean(t.closest("[data-ui-chrome], input, textarea, select, button, label, a"))
}

function pointerPressure(e: PointerEvent): number {
  if (e.pointerType === "mouse") return 0.55
  const p = e.pressure
  if (p > 0.02) return p
  return 0.55
}

export function bindPainter(
  el: HTMLElement,
  painter: PointerPainter,
  opts?: {
    onSplatFrame?: (splats: Splat[]) => void
    onDown?: () => void
    mapUv?: (x: number, y: number) => { x: number; y: number }
  },
): () => void {
  el.style.touchAction = 'none'
  el.style.userSelect = 'none'
  ;(el.style as any).webkitUserSelect = 'none'
  el.style.cursor = 'crosshair'

  const norm = (clientX: number, clientY: number) => {
    const r = el.getBoundingClientRect()
    const w = Math.max(1, r.width)
    const h = Math.max(1, r.height)
    return {
      x: Math.min(1, Math.max(0, (clientX - r.left) / w)),
      y: Math.min(1, Math.max(0, (clientY - r.top) / h)),
    }
  }

  const uvAt = (clientX: number, clientY: number) => {
    const p = norm(clientX, clientY)
    return opts?.mapUv ? opts.mapUv(p.x, p.y) : p
  }
  let usedPointer = false
  let usedPointerUntil = 0

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return
    if (eventFromChrome(e)) return
    usedPointer = true
    usedPointerUntil = performance.now() + 1500
    try { el.setPointerCapture(e.pointerId) } catch {}
    const { x, y } = uvAt(e.clientX, e.clientY)
    painter.down(e.pointerId, x, y, e.timeStamp, { pressure: pointerPressure(e) })
    opts?.onDown?.()
    e.preventDefault()
    e.stopPropagation()
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!painter.isDown) return
    const { x, y } = uvAt(e.clientX, e.clientY)
    painter.move(e.pointerId, x, y, e.timeStamp, { pressure: pointerPressure(e) })
    e.preventDefault()
  }

  const onPointerUp = (e: PointerEvent) => {
    const { x, y } = uvAt(e.clientX, e.clientY)
    painter.up(e.pointerId, x, y)
    try { el.releasePointerCapture(e.pointerId) } catch {}
  }

  const onTouchStart = (e: TouchEvent) => {
    if (eventFromChrome(e)) return
    if (usedPointer && performance.now() < usedPointerUntil) return
    e.preventDefault()
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i]!
      const { x, y } = uvAt(t.clientX, t.clientY)
      painter.down(1_000_000 + t.identifier, x, y, e.timeStamp, { pressure: t.force || 0.55 })
    }
    if (e.changedTouches.length) opts?.onDown?.()
  }
  const onTouchMove = (e: TouchEvent) => {
    if (!painter.isDown) return
    if (usedPointer && performance.now() < usedPointerUntil) return
    e.preventDefault()
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i]!
      const { x, y } = uvAt(t.clientX, t.clientY)
      painter.move(1_000_000 + t.identifier, x, y, e.timeStamp, { pressure: t.force || 0.55 })
    }
  }
  const onTouchEnd = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i]!
      const { x, y } = uvAt(t.clientX, t.clientY)
      painter.up(1_000_000 + t.identifier, x, y)
    }
  }

  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return
    if (eventFromChrome(e)) return
    if (usedPointer && performance.now() < usedPointerUntil) return
    const { x, y } = uvAt(e.clientX, e.clientY)
    painter.down(-1, x, y, e.timeStamp, { pressure: 0.55 })
    opts?.onDown?.()
    e.preventDefault()
  }
  const onMouseMove = (e: MouseEvent) => {
    if (!painter.isDown) return
    if (usedPointer && performance.now() < usedPointerUntil) return
    const { x, y } = uvAt(e.clientX, e.clientY)
    painter.move(-1, x, y, e.timeStamp, { pressure: 0.55 })
  }
  const onMouseUp = (e: MouseEvent) => {
    const { x, y } = uvAt(e.clientX, e.clientY)
    painter.up(-1, x, y)
  }

  el.addEventListener('pointerdown', onPointerDown)
  el.addEventListener('pointermove', onPointerMove)
  el.addEventListener('pointerup', onPointerUp)
  el.addEventListener('pointercancel', onPointerUp)
  el.addEventListener('lostpointercapture', onPointerUp)
  el.addEventListener('touchstart', onTouchStart, { passive: false })
  el.addEventListener('touchmove', onTouchMove, { passive: false })
  el.addEventListener('touchend', onTouchEnd, { passive: false })
  el.addEventListener('touchcancel', onTouchEnd, { passive: false })
  el.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)

  let raf = 0
  const tick = () => {
    raf = requestAnimationFrame(tick)
    const splats = painter.drain()
    if (splats.length && opts?.onSplatFrame) opts.onSplatFrame(splats)
  }
  if (opts?.onSplatFrame) raf = requestAnimationFrame(tick)

  return () => {
    el.removeEventListener('pointerdown', onPointerDown)
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('pointerup', onPointerUp)
    el.removeEventListener('pointercancel', onPointerUp)
    el.removeEventListener('lostpointercapture', onPointerUp)
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
    el.removeEventListener('touchend', onTouchEnd)
    el.removeEventListener('touchcancel', onTouchEnd)
    el.removeEventListener('mousedown', onMouseDown)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    if (raf) cancelAnimationFrame(raf)
    painter.reset()
  }
}
