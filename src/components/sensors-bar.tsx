import { useCallback, useState } from 'react'
import type { SensorsState } from '../lib/ripple/media'
import { mediaErrorMessage } from '../lib/ripple/media'

type Props = {
  sensors: SensorsState
  onChange: (s: SensorsState) => void
}

export function SensorsBar({ sensors, onChange }: Props) {
  const [busy, setBusy] = useState(false)

  const toggleCamera = useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      if (sensors.cameraOn && sensors.cameraStream) {
        sensors.cameraStream.getTracks().forEach((t) => t.stop())
        onChange({ ...sensors, cameraOn: false, cameraStream: null, error: null })
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: sensors.facingMode },
          audio: false,
        })
        onChange({
          ...sensors,
          cameraOn: true,
          cameraStream: stream,
          error: null,
        })
      }
    } catch (err) {
      onChange({ ...sensors, cameraOn: false, cameraStream: null, error: mediaErrorMessage(err) })
    } finally {
      setBusy(false)
    }
  }, [busy, sensors, onChange])

  const flipCamera = useCallback(async () => {
    if (busy) return
    const nextFacing = sensors.facingMode === 'user' ? 'environment' : 'user'
    if (!sensors.cameraOn) {
      onChange({ ...sensors, facingMode: nextFacing })
      return
    }
    setBusy(true)
    try {
      sensors.cameraStream?.getTracks().forEach((t) => t.stop())
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing },
        audio: false,
      })
      onChange({
        ...sensors,
        facingMode: nextFacing,
        cameraOn: true,
        cameraStream: stream,
        error: null,
      })
    } catch (err) {
      onChange({
        ...sensors,
        facingMode: nextFacing,
        cameraOn: false,
        cameraStream: null,
        error: mediaErrorMessage(err),
      })
    } finally {
      setBusy(false)
    }
  }, [busy, sensors, onChange])

  const toggleMic = useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      if (sensors.micOn && sensors.micStream) {
        sensors.micStream.getTracks().forEach((t) => t.stop())
        onChange({ ...sensors, micOn: false, micStream: null, error: null })
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        onChange({ ...sensors, micOn: true, micStream: stream, error: null })
      }
    } catch (err) {
      onChange({ ...sensors, micOn: false, micStream: null, error: mediaErrorMessage(err) })
    } finally {
      setBusy(false)
    }
  }, [busy, sensors, onChange])

  const btn =
    'pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white/80 backdrop-blur-md transition hover:bg-black/60 hover:text-white'

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between p-3">
      <div className="flex gap-2">
        <button
          type="button"
          className={btn}
          style={{ opacity: sensors.cameraOn ? 1 : 0.55 }}
          onClick={toggleCamera}
          aria-label="Toggle camera"
          title="Camera"
        >
          <CamIcon on={sensors.cameraOn} />
        </button>
        {sensors.cameraOn && (
          <button
            type="button"
            className={btn}
            onClick={flipCamera}
            aria-label="Flip camera"
            title="Flip camera"
          >
            <FlipIcon />
          </button>
        )}
        <button
          type="button"
          className={btn}
          style={{ opacity: sensors.micOn ? 1 : 0.55 }}
          onClick={toggleMic}
          aria-label="Toggle microphone"
          title="Microphone"
        >
          <MicIcon on={sensors.micOn} />
        </button>
      </div>
      {sensors.error && (
        <div className="pointer-events-auto max-w-[60%] rounded-lg bg-black/70 px-3 py-1.5 text-xs text-amber-200 backdrop-blur">
          {sensors.error}
        </div>
      )}
    </div>
  )
}

function CamIcon({ on }: { on: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 7h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
      <path d="M17 10l5-2v8l-5-2" />
      {!on && <path d="M3 3l18 18" strokeLinecap="round" />}
    </svg>
  )
}

function FlipIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M16 3h5v5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 3l-7 7" strokeLinecap="round" />
      <path d="M8 21H3v-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 21l7-7" strokeLinecap="round" />
    </svg>
  )
}

function MicIcon({ on }: { on: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" strokeLinecap="round" />
      <path d="M12 17v4M8 21h8" strokeLinecap="round" />
      {!on && <path d="M3 3l18 18" strokeLinecap="round" />}
    </svg>
  )
}
