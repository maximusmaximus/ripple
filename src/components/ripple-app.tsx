import { useCallback, useEffect, useMemo, useState } from 'react'
import { WallViewport } from './wall-viewport'
import { PadGate } from './pad-gate'
import { ControlsDock } from './controls-dock'
import { SensorsBar } from './sensors-bar'
import { RippleCanvas } from './ripple-canvas'
import type { SensorsState } from '../lib/ripple/media'
import { emptySensorsState } from '../lib/ripple/media'
import { releaseSensors } from './sensors-gate'

function readSearch() {
  if (typeof window === 'undefined') return { c: null as string | null, pad: false, wall: false }
  const p = new URLSearchParams(window.location.search)
  return { c: p.get('c'), pad: p.get('pad') === '1' || p.has('pad'), wall: p.get('wall') === '1' || p.has('wall') }
}

export function RippleApp() {
  const [search, setSearch] = useState(readSearch)
  const [sensors, setSensors] = useState<SensorsState>(() => ({ ...emptySensorsState }))

  useEffect(() => {
    const onPop = () => setSearch(readSearch())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => () => releaseSensors(sensors), [])

  const onSensorsChange = useCallback((next: SensorsState) => setSensors(next), [])

  const mode = useMemo(() => {
    if (search.pad && search.c) return 'pad' as const
    if (search.wall) return 'wall' as const
    return 'local' as const
  }, [search])

  if (mode === 'pad' && search.c) {
    return (
      <PadGate code={search.c.toUpperCase()}>
        <div className="relative h-dvh w-dvw overflow-hidden bg-black" style={{ touchAction: 'none' }}>
          <RippleCanvas sensors={sensors} />
          <SensorsBar sensors={sensors} onChange={onSensorsChange} />
        </div>
      </PadGate>
    )
  }

  if (mode === 'wall') {
    return <WallViewport preferredCode={search.c} />
  }

  return (
    <div className="relative h-dvh w-dvw overflow-hidden bg-black" style={{ touchAction: 'none', overscrollBehavior: 'none' }}>
      <RippleCanvas sensors={sensors} />
      <SensorsBar sensors={sensors} onChange={onSensorsChange} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center p-3 pb-6" style={{ zIndex: 40 }}>
        <div className="pointer-events-auto w-full max-w-sm">
          <ControlsDock />
        </div>
      </div>
    </div>
  )
}
