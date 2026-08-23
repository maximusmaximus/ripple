import { ColorRangeSlider } from './color-range-slider'
import { useRippleStore } from '../store/ripple'
import { PALETTE_ORDER } from '../lib/ripple/palettes'

export function ControlsDock() {
  const viscosity = useRippleStore((s) => s.viscosity)
  const waveStrength = useRippleStore((s) => s.waveStrength)
  const brushDiameter = useRippleStore((s) => s.brushDiameter)
  const setViscosity = useRippleStore((s) => s.setViscosity)
  const setWaveStrength = useRippleStore((s) => s.setWaveStrength)
  const setBrushDiameter = useRippleStore((s) => s.setBrushDiameter)
  const clearSurface = useRippleStore((s) => s.clearSurface)
  const worldId = useRippleStore((s) => s.worldId)
  const nextWorld = useRippleStore((s) => s.nextWorld)
  const prevWorld = useRippleStore((s) => s.prevWorld)
  const palette = useRippleStore((s) => s.getActivePalette())
  const worldIndex = PALETTE_ORDER.indexOf(worldId) + 1
  const diameterLabel = Math.round(brushDiameter * 200)

  return (
    <div
      className="controls-dock flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-white/15 p-4 shadow-2xl"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(16px)' }}
    >
      <div className="flex items-center justify-between text-xs text-white/70">
        <button type="button" onClick={prevWorld} className="rounded-full bg-white/10 px-3 py-1.5 hover:bg-white/20">←</button>
        <span className="font-medium tracking-wide text-white/90">
          {palette.name}{' '}
          <span className="text-white/40">{worldIndex} / {PALETTE_ORDER.length}</span>
        </span>
        <button type="button" onClick={nextWorld} className="rounded-full bg-white/10 px-3 py-1.5 hover:bg-white/20">→</button>
      </div>

      <section className="flex flex-col gap-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Feel</h3>
        <ColorRangeSlider />
        <label className="flex flex-col gap-2">
          <div className="flex justify-between text-[12px] text-white/70">
            <span>Brush diameter</span>
            <span className="font-mono tabular-nums text-white/90">{diameterLabel}</span>
          </div>
          <input
            type="range"
            min={0.01}
            max={0.12}
            step={0.002}
            value={brushDiameter}
            onChange={(e) => setBrushDiameter(parseFloat(e.target.value))}
            className="w-full"
            style={{ accentColor: '#fff' }}
          />
        </label>
        <label className="flex flex-col gap-2">
          <div className="flex justify-between text-[12px] text-white/70">
            <span>Viscosity</span>
            <span className="font-mono tabular-nums text-white/90">{viscosity.toFixed(2)}</span>
          </div>
          <input
            type="range" min={0.85} max={0.999} step={0.001}
            value={viscosity}
            onChange={(e) => setViscosity(parseFloat(e.target.value))}
            className="w-full"
            style={{ accentColor: '#fff' }}
          />
        </label>
        <label className="flex flex-col gap-2">
          <div className="flex justify-between text-[12px] text-white/70">
            <span>Wave strength</span>
            <span className="font-mono tabular-nums text-white/90">{waveStrength.toFixed(2)}</span>
          </div>
          <input
            type="range" min={0.1} max={1.5} step={0.01}
            value={waveStrength}
            onChange={(e) => setWaveStrength(parseFloat(e.target.value))}
            className="w-full"
            style={{ accentColor: '#fff' }}
          />
        </label>
      </section>
      <button
        type="button"
        onClick={clearSurface}
        className="w-full rounded-xl bg-white/10 py-2.5 text-sm text-white/85 hover:bg-white/20"
      >
        Clear surface
      </button>
    </div>
  )
}
