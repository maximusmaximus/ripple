import { ChevronDown, ChevronLeft, ChevronRight, Cast } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { ColorRangeSlider } from "./color-range-slider";
import { TexturePicker } from "./texture-picker";
import { BrushPicker } from "./brush-picker";
import { LayerFxPicker } from "./brush-fx";
import { BrushShadow } from "./brush-shadow";
import { PresetStrip } from "./preset-strip";
import { useRippleStore } from "@/store/ripple";
import { PALETTE_ORDER } from "@/lib/ripple/palettes";

export function ControlsDock() {
  const navigate = useNavigate({ from: "/" });
  const viscosity = useRippleStore((s) => s.viscosity);
  const waveStrength = useRippleStore((s) => s.waveStrength);
  const brushDiameter = useRippleStore((s) => s.brushDiameter);
  const cameraInteract = useRippleStore((s) => s.cameraInteract);
  const micSensitivity = useRippleStore((s) => s.micSensitivity);
  const gyroSensitivity = useRippleStore((s) => s.gyroSensitivity);
  const setViscosity = useRippleStore((s) => s.setViscosity);
  const setWaveStrength = useRippleStore((s) => s.setWaveStrength);
  const setBrushDiameter = useRippleStore((s) => s.setBrushDiameter);
  const setCameraInteract = useRippleStore((s) => s.setCameraInteract);
  const setMicSensitivity = useRippleStore((s) => s.setMicSensitivity);
  const setGyroSensitivity = useRippleStore((s) => s.setGyroSensitivity);
  const clearSurface = useRippleStore((s) => s.clearSurface);
  const cleanSession = useRippleStore((s) => s.cleanSession);
  const worldId = useRippleStore((s) => s.worldId);
  const nextWorld = useRippleStore((s) => s.nextWorld);
  const prevWorld = useRippleStore((s) => s.prevWorld);
  const setDockOpen = useRippleStore((s) => s.setDockOpen);
  const palette = useRippleStore((s) => s.getActivePalette());
  const worldIndex = PALETTE_ORDER.indexOf(worldId) + 1;
  const diameterLabel = Math.round(brushDiameter * 200);

  return (
    <div className="controls-dock flex w-full max-w-sm max-h-[min(72dvh,36rem)] flex-col gap-3 overflow-y-auto rounded-3xl border border-line bg-ink/85 p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between text-xs text-muted">
        <button
          type="button"
          onClick={prevWorld}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-fg/10 hover:bg-fg/20"
          aria-label="Previous world"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center px-2">
          <span className="font-medium tracking-wide text-fg">
            {palette.name}{" "}
            <span className="text-subtle">
              {worldIndex} / {PALETTE_ORDER.length}
            </span>
          </span>
          <span className="max-w-[13rem] truncate text-center text-[10px] leading-tight text-subtle">
            {palette.blurb}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={nextWorld}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-fg/10 hover:bg-fg/20"
            aria-label="Next world"
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setDockOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-fg/10 text-subtle hover:bg-fg/20 hover:text-fg"
            aria-label="Hide menu"
            title="Hide"
          >
            <ChevronDown className="size-4" />
          </button>
        </div>
      </div>

      <section className="flex flex-col gap-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-subtle">Brush</h3>
        <BrushPicker />
        <label className="flex flex-col gap-2">
          <div className="flex justify-between text-[12px] text-muted">
            <span>Diameter</span>
            <span className="font-mono tabular-nums text-fg">{diameterLabel}</span>
          </div>
          <input
            type="range"
            min={0.01}
            max={0.12}
            step={0.002}
            value={brushDiameter}
            onChange={(e) => setBrushDiameter(parseFloat(e.target.value))}
            className="w-full"
            suppressHydrationWarning
          />
        </label>
        <BrushShadow />
        <LayerFxPicker />
      </section>

      <PresetStrip />

      <section className="flex flex-col gap-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-subtle">Surface</h3>
        <TexturePicker />
        <ColorRangeSlider />
        <label className="flex flex-col gap-2">
          <div className="flex justify-between text-[12px] text-muted">
            <span>Viscosity</span>
            <span className="font-mono tabular-nums text-fg">{viscosity.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.85}
            max={0.999}
            step={0.001}
            value={viscosity}
            onChange={(e) => setViscosity(parseFloat(e.target.value))}
            className="w-full"
            suppressHydrationWarning
          />
        </label>
        <label className="flex flex-col gap-2">
          <div className="flex justify-between text-[12px] text-muted">
            <span>Wave strength</span>
            <span className="font-mono tabular-nums text-fg">{waveStrength.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1.5}
            step={0.01}
            value={waveStrength}
            onChange={(e) => setWaveStrength(parseFloat(e.target.value))}
            className="w-full"
            suppressHydrationWarning
          />
        </label>
      </section>

      <section className="flex flex-col gap-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-subtle">Sensors</h3>
        <label className="flex flex-col gap-2">
          <div className="flex justify-between text-[12px] text-muted">
            <span>Camera interact</span>
            <span className="font-mono tabular-nums text-fg">{Math.round(cameraInteract * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={cameraInteract}
            onChange={(e) => setCameraInteract(parseFloat(e.target.value))}
            className="w-full"
            suppressHydrationWarning
          />
        </label>
        <label className="flex flex-col gap-2">
          <div className="flex justify-between text-[12px] text-muted">
            <span>Mic sensitivity</span>
            <span className="font-mono tabular-nums text-fg">{Math.round(micSensitivity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.01}
            value={micSensitivity}
            onChange={(e) => setMicSensitivity(parseFloat(e.target.value))}
            className="w-full"
            suppressHydrationWarning
          />
        </label>
        <label className="flex flex-col gap-2">
          <div className="flex justify-between text-[12px] text-muted">
            <span>Gyro sensitivity</span>
            <span className="font-mono tabular-nums text-fg">{Math.round(gyroSensitivity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.01}
            value={gyroSensitivity}
            onChange={(e) => setGyroSensitivity(parseFloat(e.target.value))}
            className="w-full"
            suppressHydrationWarning
          />
        </label>
      </section>

      <button
        type="button"
        onClick={clearSurface}
        className="w-full rounded-xl bg-fg/10 py-2.5 text-sm text-fg/90 hover:bg-fg/20"
      >
        Clear surface
      </button>
      <button
        type="button"
        onClick={cleanSession}
        className="w-full rounded-xl border border-line bg-fg/5 py-2.5 text-sm text-muted hover:bg-fg/10 hover:text-fg"
      >
        Clean Session
      </button>
      <p className="-mt-2 text-[10px] leading-snug text-subtle">
        Resets the live mix for the next person. Saved presets stay.
      </p>
      <button
        type="button"
        onClick={() => navigate({ search: { mode: "wall" } })}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-fg/5 py-2.5 text-sm text-muted hover:bg-fg/10 hover:text-fg"
      >
        <Cast className="size-4" />
        Cast to a second display
      </button>
    </div>
  );
}
