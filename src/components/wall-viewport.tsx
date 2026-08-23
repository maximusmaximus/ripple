/**
 * Desktop / wall viewport.
 * Connected pad → pure remote stream. Disconnect → QR reappears centered (2x size).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useCastHost, type RemoteFrame, type RemoteInput } from '../hooks/use-cast-host'
import { QrMark } from './qr-mark'

type Props = {
  preferredCode?: string | null
  onRemoteInput?: (input: RemoteInput) => void
  className?: string
}

export function WallViewport({ preferredCode, onRemoteInput, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [frameCount, setFrameCount] = useState(0)
  const lastBitmap = useRef<ImageBitmap | null>(null)

  const drawFrame = useCallback(async (frame: RemoteFrame) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    try {
      const blob = new Blob([frame.jpeg], { type: 'image/jpeg' })
      const bmp = await createImageBitmap(blob)
      if (canvas.width !== bmp.width || canvas.height !== bmp.height) {
        canvas.width = bmp.width
        canvas.height = bmp.height
      }
      ctx.drawImage(bmp, 0, 0)
      lastBitmap.current?.close()
      lastBitmap.current = bmp
      setFrameCount((n) => n + 1)
    } catch (err) {
      console.warn('[wall] frame decode failed', err)
    }
  }, [])

  const host = useCastHost({ preferredCode, onCamFrame: drawFrame, onRemoteInput })

  useEffect(() => () => { lastBitmap.current?.close() }, [])

  const showPair = host.showPairUI

  return (
    <div
      className={`relative h-dvh w-dvw overflow-hidden bg-black ${className}`}
      data-wall="true"
      data-cast-state={host.state}
    >
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-500 ${
          host.isLive ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {host.isLive && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)' }}
        />
      )}

      {host.isLive && (
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white/80 backdrop-blur-md">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          Live from phone
          <span className="tabular-nums opacity-60">{frameCount}f</span>
          <button
            type="button"
            onClick={host.disconnect}
            className="ml-1 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/50 hover:bg-white/10 hover:text-white"
          >
            End
          </button>
        </div>
      )}

      <div
        className={`absolute inset-0 z-20 flex flex-col items-center justify-center transition-all duration-500 ${
          showPair ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none scale-95'
        }`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, #1a1a2e 0%, #0a0a0f 70%)' }}
        />

        <div className="relative z-10 flex max-w-[min(92vw,480px)] flex-col items-center gap-5 rounded-3xl border border-white/10 bg-black/70 p-6 shadow-2xl backdrop-blur-xl">
          <div className="text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/40">Second display</p>
            <h2 className="mt-1 text-lg font-semibold text-white/90">
              {host.state === 'waiting' ? 'Connecting…' : host.state === 'reconnecting' ? 'Reconnecting…' : 'Scan to cast'}
            </h2>
            <p className="mt-1 text-sm text-white/50">Open this on your phone to stream the live surface here</p>
          </div>

          <div className="rounded-2xl bg-white p-3 shadow-inner">
            <QrMark value={host.pairUrl} size={400} />
          </div>

          <div className="flex w-full flex-col items-center gap-2">
            <p className="font-mono text-2xl tracking-[0.35em] text-white/90">{host.code}</p>
            <p className="text-center text-[11px] text-white/35">or open the URL and enter the code above</p>
          </div>

          {host.lastError && (
            <p className="rounded-lg bg-rose-500/15 px-3 py-1.5 text-center text-xs text-rose-300">
              {host.lastError} — showing QR again
            </p>
          )}

          <button
            type="button"
            onClick={host.regenerateCode}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            New code
          </button>
        </div>

        <div className="relative z-10 mt-6 flex items-center gap-2 text-xs text-white/40">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              host.state === 'waiting'
                ? 'animate-pulse bg-amber-400'
                : host.state === 'reconnecting'
                  ? 'animate-pulse bg-rose-400'
                  : 'bg-white/30'
            }`}
          />
          {host.state === 'waiting'
            ? 'Phone detected — finishing handshake'
            : host.state === 'reconnecting'
              ? 'Connection lost'
              : 'Waiting for a phone'}
        </div>
      </div>
    </div>
  )
}
