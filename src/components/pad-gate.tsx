/**
 * Phone pad shell — connects to wall via code and renders children once live.
 */

import { useCallback, useState, type ReactNode } from 'react'
import { useCastPad } from '../hooks/use-cast-pad'

type Props = {
  code: string
  children: ReactNode
}

export function PadGate({ code, children }: Props) {
  const pad = useCastPad({ code })
  const [started, setStarted] = useState(false)

  const handleConnect = useCallback(async () => {
    setStarted(true)
    await pad.connect()
  }, [pad])

  if (pad.isLive) {
    return <>{children}</>
  }

  return (
    <div className="flex h-dvh w-dvw flex-col items-center justify-center gap-6 bg-[#0a0a0f] px-6 text-center text-white">
      <div className="max-w-sm space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/40">
          Phone pad
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Stream to the big screen</h1>
        <p className="text-sm text-white/50">
          Code <span className="font-mono tracking-widest text-white/80">{code}</span>
        </p>
      </div>

      {pad.state === 'error' && (
        <p className="rounded-lg bg-rose-500/15 px-4 py-2 text-sm text-rose-300">{pad.error}</p>
      )}

      <button
        type="button"
        onClick={handleConnect}
        disabled={pad.state === 'connecting' || started}
        className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition active:scale-95 disabled:opacity-50"
      >
        {pad.state === 'connecting' ? 'Connecting…' : 'Start streaming'}
      </button>

      <p className="max-w-xs text-xs text-white/35">
        Camera frames, touch, and tilt stream to the wall in real time. Nothing is uploaded.
      </p>
    </div>
  )
}
