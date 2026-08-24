import type { BrushFeel, BrushKind } from "./brushes"

export type Splat = { x: number; y: number; force: number; radius: number }
type Track = { x: number; y: number; down: boolean; t: number; w: number; heading: number }

const MAX_SPLATS_PER_MOVE = 128
const MIN_STEP = 0.002

export type StrokeInput = { pressure?: number }

export class PointerPainter {
  private tracks = new Map<number, Track>()
  private queue: Splat[] = []
  private radius = 0.03
  private force = 0.7
  private kind: BrushKind = "round"
  private feel: BrushFeel = "steady"
  private nib = Math.PI / 4
  private spread = 1.8
  private grains = 4

  setBrush(
    radius: number,
    force: number,
    kind: BrushKind = "round",
    spread = 1.8,
    grains = 4,
    feel: BrushFeel = "steady",
    nib = Math.PI / 4,
  ) {
    this.radius = Math.max(0.005, radius)
    this.force = Math.max(0.18, force)
    this.kind = kind
    this.spread = Math.max(0.3, spread)
    this.grains = Math.max(2, Math.min(10, Math.round(grains)))
    this.feel = feel
    this.nib = nib
  }

  down(id: number, x: number, y: number, t = performance.now(), input: StrokeInput = {}) {
    const w = this.dynScale(0, input.pressure ?? 0.5, 0, t)
    this.tracks.set(id, { x, y, down: true, t, w, heading: this.nib })
    this.emit(x, y, this.force, w, this.nib)
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
    const target = this.dynScale(speed, input.pressure ?? 0.5, heading, t)
    const w = last.w * 0.62 + target * 0.38

    if (dist < 1e-7) {
      this.emit(x, y, this.force * 0.55, w * 0.9, heading)
      this.tracks.set(id, { x, y, down: true, t, w, heading })
      return
    }

    const step = this.kind === "scatter" ? MIN_STEP * 1.6 : MIN_STEP
    const steps = Math.max(1, Math.ceil(dist / step))
    const useSteps = Math.min(MAX_SPLATS_PER_MOVE, steps)
    const inv = 1 / useSteps

    for (let i = 1; i <= useSteps; i++) {
      const u = i * inv
      const ww = last.w + (w - last.w) * u
      this.emit(last.x + dx * u, last.y + dy * u, this.force, ww, heading)
    }
    this.tracks.set(id, { x, y, down: true, t, w, heading })
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

  private dynScale(speed: number, pressure: number, heading: number, t: number): number {
    const p = pressure > 0.02 ? Math.max(0.08, Math.min(1, pressure)) : 0.55
    switch (this.feel) {
      case "press":
        return 0.28 + p * 1.55
      case "taper":
        return mix(1.65, 0.22, clamp01(speed / 0.012))
      case "swell":
        return mix(0.32, 1.75, clamp01(speed / 0.01))
      case "nib": {
        const w = Math.abs(Math.sin(heading - this.nib))
        return 0.22 + w * 1.55
      }
      case "pulse":
        return 0.45 + 0.85 * (0.5 + 0.5 * Math.sin(t * 0.014))
      default:
        return 1
    }
  }

  private emit(x: number, y: number, force: number, scale: number, heading: number) {
    const r = this.radius * scale
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
        })
      }
      return
    }
    if (this.kind === "soft") {
      this.queue.push({ x, y, force: force * 0.55, radius: r * 1.55 })
      this.queue.push({ x, y, force: force * 0.85, radius: r * 0.7 })
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
        })
      }
      return
    }
    this.queue.push({ x, y, force, radius: r })
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

  let usedPointer = false
  let usedPointerUntil = 0

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return
    if (eventFromChrome(e)) return
    usedPointer = true
    usedPointerUntil = performance.now() + 1500
    try { el.setPointerCapture(e.pointerId) } catch {}
    const { x, y } = norm(e.clientX, e.clientY)
    painter.down(e.pointerId, x, y, e.timeStamp, { pressure: pointerPressure(e) })
    opts?.onDown?.()
    e.preventDefault()
    e.stopPropagation()
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!painter.isDown) return
    const { x, y } = norm(e.clientX, e.clientY)
    painter.move(e.pointerId, x, y, e.timeStamp, { pressure: pointerPressure(e) })
    e.preventDefault()
  }

  const onPointerUp = (e: PointerEvent) => {
    const { x, y } = norm(e.clientX, e.clientY)
    painter.up(e.pointerId, x, y)
    try { el.releasePointerCapture(e.pointerId) } catch {}
  }

  const onTouchStart = (e: TouchEvent) => {
    if (eventFromChrome(e)) return
    if (usedPointer && performance.now() < usedPointerUntil) return
    e.preventDefault()
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i]!
      const { x, y } = norm(t.clientX, t.clientY)
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
      const { x, y } = norm(t.clientX, t.clientY)
      painter.move(1_000_000 + t.identifier, x, y, e.timeStamp, { pressure: t.force || 0.55 })
    }
  }
  const onTouchEnd = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i]!
      const { x, y } = norm(t.clientX, t.clientY)
      painter.up(1_000_000 + t.identifier, x, y)
    }
  }

  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return
    if (eventFromChrome(e)) return
    if (usedPointer && performance.now() < usedPointerUntil) return
    const { x, y } = norm(e.clientX, e.clientY)
    painter.down(-1, x, y, e.timeStamp, { pressure: 0.55 })
    opts?.onDown?.()
    e.preventDefault()
  }
  const onMouseMove = (e: MouseEvent) => {
    if (!painter.isDown) return
    if (usedPointer && performance.now() < usedPointerUntil) return
    const { x, y } = norm(e.clientX, e.clientY)
    painter.move(-1, x, y, e.timeStamp, { pressure: 0.55 })
  }
  const onMouseUp = (e: MouseEvent) => {
    const { x, y } = norm(e.clientX, e.clientY)
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
