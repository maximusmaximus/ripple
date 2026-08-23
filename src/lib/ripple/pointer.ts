export type Splat = { x: number; y: number; force: number; radius: number }
type Track = { x: number; y: number; down: boolean; t: number }

const MAX_SPLATS_PER_MOVE = 128
const MIN_STEP = 0.002

export type BrushKind = 'round' | 'soft' | 'scatter'

export class PointerPainter {
  private tracks = new Map<number, Track>()
  private queue: Splat[] = []
  private radius = 0.03
  private force = 0.7
  private kind: BrushKind = 'round'

  setBrush(radius: number, force: number, kind: BrushKind = 'round') {
    this.radius = Math.max(0.006, radius)
    this.force = Math.max(0.2, force)
    this.kind = kind
  }

  private emit(x: number, y: number, forceScale = 1) {
    if (this.kind === 'scatter') {
      const n = 4
      const spread = this.radius * 1.6
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.8
        const d = Math.random() * spread
        this.queue.push({
          x: Math.min(1, Math.max(0, x + Math.cos(a) * d)),
          y: Math.min(1, Math.max(0, y + Math.sin(a) * d)),
          force: this.force * forceScale * (0.45 + Math.random() * 0.55),
          radius: this.radius * (0.35 + Math.random() * 0.45),
        })
      }
      return
    }
    const soft = this.kind === 'soft'
    this.queue.push({
      x,
      y,
      force: this.force * forceScale * (soft ? 0.85 : 1),
      radius: this.radius * (soft ? 1.15 : 1),
    })
  }

  down(id: number, x: number, y: number, t = performance.now()) {
    this.tracks.set(id, { x, y, down: true, t })
    this.emit(x, y, 1)
  }

  move(id: number, x: number, y: number, t = performance.now()) {
    let last = this.tracks.get(id)
    if (!last || !last.down) {
      this.tracks.set(id, { x, y, down: true, t })
      this.emit(x, y, 1)
      return
    }

    const dx = x - last.x
    const dy = y - last.y
    const dist = Math.hypot(dx, dy)
    if (dist < 1e-7) {
      this.emit(x, y, 0.55)
      this.tracks.set(id, { x, y, down: true, t })
      return
    }

    // Soft marks step a little farther so they feel airy; scatter denser.
    const step =
      this.kind === 'soft' ? MIN_STEP * 1.35 : this.kind === 'scatter' ? MIN_STEP * 0.85 : MIN_STEP
    const steps = Math.max(1, Math.ceil(dist / step))
    const useSteps = Math.min(MAX_SPLATS_PER_MOVE, steps)
    const inv = 1 / useSteps

    for (let i = 1; i <= useSteps; i++) {
      const u = i * inv
      this.emit(last.x + dx * u, last.y + dy * u, 1)
    }
    this.tracks.set(id, { x, y, down: true, t })
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
    if (e.pointerType === 'mouse' && e.button !== 0) return
    usedPointer = true
    usedPointerUntil = performance.now() + 1500
    try { el.setPointerCapture(e.pointerId) } catch {}
    const { x, y } = norm(e.clientX, e.clientY)
    painter.down(e.pointerId, x, y, e.timeStamp)
    opts?.onDown?.()
    e.preventDefault()
    e.stopPropagation()
  }

  const onPointerMove = (e: PointerEvent) => {
    const held =
      painter.isDown ||
      (e.buttons & 1) === 1 ||
      e.pressure > 0 ||
      e.pointerType === 'touch'
    if (!held && !painter.isDown) return
    const { x, y } = norm(e.clientX, e.clientY)
    painter.move(e.pointerId, x, y, e.timeStamp)
    e.preventDefault()
  }

  const onPointerUp = (e: PointerEvent) => {
    const { x, y } = norm(e.clientX, e.clientY)
    painter.up(e.pointerId, x, y)
    try { el.releasePointerCapture(e.pointerId) } catch {}
  }

  const onTouchStart = (e: TouchEvent) => {
    if (usedPointer && performance.now() < usedPointerUntil) return
    e.preventDefault()
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i]!
      const { x, y } = norm(t.clientX, t.clientY)
      painter.down(1_000_000 + t.identifier, x, y, e.timeStamp)
    }
    if (e.changedTouches.length) opts?.onDown?.()
  }
  const onTouchMove = (e: TouchEvent) => {
    if (usedPointer && performance.now() < usedPointerUntil) return
    e.preventDefault()
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i]!
      const { x, y } = norm(t.clientX, t.clientY)
      painter.move(1_000_000 + t.identifier, x, y, e.timeStamp)
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
    if (usedPointer && performance.now() < usedPointerUntil) return
    const { x, y } = norm(e.clientX, e.clientY)
    painter.down(-1, x, y, e.timeStamp)
    opts?.onDown?.()
    e.preventDefault()
  }
  const onMouseMove = (e: MouseEvent) => {
    if ((e.buttons & 1) !== 1 && !painter.isDown) return
    if (usedPointer && performance.now() < usedPointerUntil) return
    const { x, y } = norm(e.clientX, e.clientY)
    painter.move(-1, x, y, e.timeStamp)
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
