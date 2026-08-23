import { useEffect, useRef } from 'react'
import { RippleEngine } from '../lib/ripple/engine'
import { PointerPainter, bindPainter, type Splat } from '../lib/ripple/pointer'
import { useRippleStore } from '../store/ripple'
import { PALETTES } from '../lib/ripple/palettes'
import type { SensorsState } from '../lib/ripple/media'
import type { ScreenAngle } from '../lib/ripple/orientation'

type Props = {
  sensors: SensorsState
  /** Current screen orientation angle — rotates camera UVs to match the device. */
  orientationAngle?: ScreenAngle
  /** Called when user starts painting on the canvas (pointer down). */
  onPaintStart?: () => void
}

export function RippleCanvas({
  sensors,
  orientationAngle = 0,
  onPaintStart,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<RippleEngine | null>(null)
  const painterRef = useRef(new PointerPainter())
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const onPaintStartRef = useRef(onPaintStart)
  onPaintStartRef.current = onPaintStart

  const worldId = useRippleStore((s) => s.worldId)
  const viscosity = useRippleStore((s) => s.viscosity)
  const waveStrength = useRippleStore((s) => s.waveStrength)
  const brushDiameter = useRippleStore((s) => s.brushDiameter)
  const clearToken = useRippleStore((s) => s.clearToken)
  const rangeStart = useRippleStore((s) => {
    const r = s.colorRanges[s.worldId]
    if (r) return r.start
    return PALETTES[s.worldId]?.defaultRange[0] ?? 0
  })
  const rangeEnd = useRippleStore((s) => {
    const r = s.colorRanges[s.worldId]
    if (r) return r.end
    return PALETTES[s.worldId]?.defaultRange[1] ?? 1
  })

  // Init engine + pointer binding
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let engine: RippleEngine
    try {
      engine = new RippleEngine(canvas)
    } catch (err) {
      console.error(err)
      return
    }
    engineRef.current = engine
    engine.resize()
    engine.start()

    const painter = painterRef.current
    painter.setBrush(brushDiameter / 2, 0.7)

    const onSplatFrame = (splats: Splat[]) => {
      engine.applySplats(splats)
    }

    const unbind = bindPainter(canvas, painter, {
      onSplatFrame,
      onDown: () => onPaintStartRef.current?.(),
    })

    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)
    const ro = new ResizeObserver(onResize)
    ro.observe(canvas)

    return () => {
      unbind()
      ro.disconnect()
      window.removeEventListener('resize', onResize)
      engine.dispose()
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync sim params + world camera mix
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    const palette = PALETTES[worldId] ?? PALETTES.abyss
    engine.setParams({
      viscosity,
      waveStrength,
      colors: palette.colors,
      rangeStart,
      rangeEnd,
      // Worlds with higher cam affinity show more camera when stream is on
      cameraMix: sensors.cameraOn ? Math.max(0.35, palette.cameraMix ?? 0.55) : 0,
    })
  }, [worldId, viscosity, waveStrength, rangeStart, rangeEnd, sensors.cameraOn])

  // Brush size
  useEffect(() => {
    painterRef.current.setBrush(brushDiameter / 2, 0.65 + waveStrength * 0.25)
  }, [brushDiameter, waveStrength])

  // Clear
  useEffect(() => {
    if (clearToken > 0) engineRef.current?.clear()
  }, [clearToken])

  // Attach / detach camera stream → hidden <video> → engine texture
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return

    const stream = sensors.cameraOn ? sensors.cameraStream : null
    if (!stream) {
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      engine.setCamera(null)
      return
    }

    let video = videoRef.current
    if (!video) {
      video = document.createElement('video')
      video.setAttribute('playsinline', 'true')
      video.setAttribute('webkit-playsinline', 'true')
      video.muted = true
      video.autoplay = true
      video.playsInline = true
      video.style.display = 'none'
      document.body.appendChild(video)
      videoRef.current = video
    }

    video.srcObject = stream
    const play = () => {
      video!.play().catch(() => {})
    }
    play()
    video.addEventListener('loadedmetadata', play)

    engine.setCamera(video, {
      angle: orientationAngle,
      mirror: sensors.facingMode === 'user',
      mix: Math.max(0.35, (PALETTES[worldId] ?? PALETTES.abyss).cameraMix ?? 0.55),
    })

    return () => {
      video?.removeEventListener('loadedmetadata', play)
    }
  }, [sensors.cameraOn, sensors.cameraStream, sensors.facingMode, worldId, orientationAngle])

  // Keep camera UV rotation in sync with device orientation
  useEffect(() => {
    engineRef.current?.setCameraOrientation(orientationAngle)
  }, [orientationAngle])

  // Cleanup hidden video on unmount
  useEffect(() => {
    return () => {
      const v = videoRef.current
      if (v) {
        v.srcObject = null
        v.remove()
        videoRef.current = null
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full touch-none"
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        touchAction: 'none',
        cursor: 'crosshair',
      }}
    />
  )
}
