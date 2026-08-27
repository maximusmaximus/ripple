import {
  BRUSH_FX,
  FX_LAYERS,
  asFxLayers,
  asFxList,
  fxConflictsWith,
  getBrushFx,
  type BrushFxId,
  type FxLayerId,
} from "@/lib/ripple/blend";
import { useRippleStore } from "@/store/ripple";
import { TipMark, TipCopy } from "./tip-mark";

export function LayerFxPicker() {
  const fxSig = useRippleStore((s) => asFxList(s.brushFx[s.brushId]).join(","));
  const active = asFxList(fxSig.split(",") as BrushFxId[]);
  const setBrushFx = useRippleStore((s) => s.setBrushFx);
  const fxOpacity = useRippleStore((s) => s.brushFxOpacity);
  const setBrushFxOpacity = useRippleStore((s) => s.setBrushFxOpacity);
  const layerSig = useRippleStore((s) => asFxLayers(s.fxLayers).join(","));
  const layers = asFxLayers(layerSig ? (layerSig.split(",") as FxLayerId[]) : []);
  const toggleFxLayer = useRippleStore((s) => s.toggleFxLayer);
  const names = active.map((id) => getBrushFx(id).name).join(" · ");
  const layerNames = layers.map((id) => FX_LAYERS.find((l) => l.id === id)?.name).filter(Boolean);
  const open = layers.length > 0;
  const hint = active.length > 1
    ? `Stack: ${names}. Darken and Lighten families replace each other.`
    : getBrushFx(active[0] ?? "normal").hint;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          Layer FX
          <TipMark id="layerfx" />
        </span>
        <span className="max-w-[70%] truncate text-right text-[11px] font-medium text-fg/80">
          {open ? `${layerNames.join(" · ")} · ${names}` : "Off"}
        </span>
      </div>
      <TipCopy>{open ? "Apply the mix to the layers you tap." : "Tap a layer to open the mix."}</TipCopy>
      <div className="grid grid-cols-5 gap-1" role="group" aria-label="Apply FX to">
        {FX_LAYERS.map((l) => {
          const on = layers.includes(l.id);
          return (
            <button
              key={l.id}
              type="button"
              title={l.hint}
              aria-pressed={on}
              onClick={() => toggleFxLayer(l.id)}
              className={
                "rounded-md border px-0.5 py-1.5 text-center text-[10px] font-medium leading-tight transition " +
                (on
                  ? "border-fg/70 bg-fg/15 text-fg"
                  : "border-line/60 text-muted hover:border-fg/40 hover:text-fg/80")
              }
            >
              {l.id === "shadow" ? "Shadow" : l.name}
            </button>
          );
        })}
      </div>
      {open && (
        <>
          <TipCopy>{hint}</TipCopy>
          <div className="grid grid-cols-5 gap-1" role="group" aria-label="Mix modes">
            {BRUSH_FX.map((m) => {
              const on = active.includes(m.id);
              const conflict = !on && fxConflictsWith(active, m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  title={conflict ? "Replaces the opposite tone family" : m.hint}
                  aria-pressed={on}
                  onClick={() => setBrushFx(m.id)}
                  className={
                    "rounded-md border px-0.5 py-1.5 text-center text-[10px] font-medium leading-tight transition " +
                    (on
                      ? "border-fg/70 bg-fg/15 text-fg"
                      : conflict
                        ? "border-line/40 text-subtle/70 hover:border-fg/30 hover:text-fg/70"
                        : "border-line/60 text-muted hover:border-fg/40 hover:text-fg/80")
                  }
                >
                  {m.name}
                </button>
              );
            })}
          </div>
          <label className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[12px] text-muted">
              <span>FX opacity</span>
              <span className="font-mono tabular-nums text-fg">{Math.round(fxOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={fxOpacity}
              onChange={(e) => setBrushFxOpacity(parseFloat(e.target.value))}
              className="w-full"
              suppressHydrationWarning
            />
          </label>
        </>
      )}
    </div>
  );
}

export { LayerFxPicker as BrushFxPicker };
export type { BrushFxId };
