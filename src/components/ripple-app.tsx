import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { WallViewport } from './wall-viewport'
import { PadGate } from './pad-gate'
import { ControlsDock } from './controls-dock'
import { SensorsBar } from './sensors-bar'
import { RippleCanvas } from './ripple-canvas'
import type { SensorsState } from '../lib/ripple/media'
import { emptySensorsState } from '../lib/ripple/media'
import { releaseSensors } from './sensors-gate'
import { useRippleStore } from '../store/ripple'
import { useOrientation } from '../hooks/use-orientation'

function readSearch() {
  if (typeof window === 'undefined') return { c: null as string | null, pad: false, wall: false }
  const p = new URLSearchParams(window.location.search)
  return { c: p.get('c'), pad: p.get('pad') === '1' || p.has('pad'), wall: p.get('wall') === '1' || p.has('wall') }
}

export function RippleApp() {
  const [search, setSearch] = useState(readSearch)
  const [sensors, setSensors] = useState<SensorsState>(() => ({ ...emptySensorsState }))
  const dockOpen = useRippleStore((s) => s.dockOpen)
  const setDockOpen = useRippleStore((s) => s.setDockOpen)
  const { angle, isLandscape } = useOrientation()
  const dockPanelRef = useRef<HTMLDivElement>(null)

  // Landscape = immersive: force-close dock and hide every chrome icon/menu
  useEffect(() => {
    if (isLandscape) setDockOpen(false)
  }, [isLandscape, setDockOpen])

  // Click / tap outside the menu panel closes it
  useEffect(() => {
    if (!dockOpen || isLandscape) return

    const onPointerDown = (e: PointerEvent) => {
      const panel = dockPanelRef.current
      if (!panel) return
      const target = e.target
      if (!(target instanceof Node)) return
      // Inside the Feel dock → keep open
      if (panel.contains(target)) return
      setDockOpen(false)
    }

    // Capture phase so we still see the event even if canvas stops propagation
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [dockOpen, isLandscape, setDockOpen])

  useEffect(() => {
    const onPop = () => setSearch(readSearch())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => () => releaseSensors(sensors), [])

  const onSensorsChange = useCallback((next: SensorsState) => setSensors(next), [])

  const onPaintStart = useCallback(() => {
    setDockOpen(false)
  }, [setDockOpen])

  const mode = useMemo(() => {
    if (search.pad && search.c) return 'pad' as const
    if (search.wall) return 'wall' as const
    return 'local' as const
  }, [search])

  // Landscape: no dock, no sensor icons, no Menu button
  const showChrome = !isLandscape

  if (mode === 'pad' && search.c) {
    return (
      <PadGate code={search.c.toUpperCase()}>
        <div className="relative h-dvh w-dvw overflow-hidden bg-black" style={{ touchAction: 'none' }}>
          <RippleCanvas
            sensors={sensors}
            orientationAngle={angle}
            onPaintStart={onPaintStart}
          />
          {showChrome && <SensorsBar sensors={sensors} onChange={onSensorsChange} />}
        </div>
      </PadGate>
    )
  }

  if (mode === 'wall') {
    return <WallViewport preferredCode={search.c} />
  }

  return (
    <div
      className="relative h-dvh w-dvw overflow-hidden bg-black"
      style={{ touchAction: 'none', overscrollBehavior: 'none' }}
    >
      <RippleCanvas
        sensors={sensors}
        orientationAngle={angle}
        onPaintStart={onPaintStart}
      />

      {showChrome && <SensorsBar sensors={sensors} onChange={onSensorsChange} />}

      {showChrome && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center p-3 pb-6 transition-all duration-300 ease-out"
          style={{
            zIndex: 40,
            opacity: dockOpen ? 1 : 0,
            transform: dockOpen ? 'translateY(0)' : 'translateY(110%)',
          }}
          aria-hidden={!dockOpen}
        >
          <div
            ref={dockPanelRef}
            className="w-full max-w-sm"
            style={{ pointerEvents: dockOpen ? 'auto' : 'none' }}
          >
            <ControlsDock />
          </div>
        </div>
      )}

      {showChrome && !dockOpen && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center pb-5">
          <button
            type="button"
            className="pointer-events-auto flex h-10 items-center gap-2 rounded-full border border-white/20 bg-black/55 px-4 text-sm text-white/85 shadow-lg backdrop-blur-md transition hover:bg-black/70 hover:text-white"
            onClick={() => setDockOpen(true)}
            aria-label="Show menu"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Menu
          </button>
        </div>
      )}
    </div>
  )
}
