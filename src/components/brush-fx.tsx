import {
  BRUSH_FX_GROUPS,
  FX_LAYERS,
  asFxLayers,
  asFxList,
  fxConflictsWith,
  getBrushFx,
  type BrushFxId,
  type FxLayerId,
} from "@/lib/ripple/blend";
import { useRippleStore } from "@/store/ripple";
import { BrushShadow } from "./brush-shadow";

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
  const hints = active.map((id) => getBrushFx(id).hint);
  const layerNames = layers.map((id) => FX_LAYERS.find((l) => l.id === id)?.name).filter(Boolean);
  const open = layers.length > 0;
  const shadowOpen = layers.includes("shadow");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-[12px] text-muted">
        <span>Layer FX</span>
        <span className="max-w-[70%] truncate text-right text-[11px] font-medium text-fg/80">
          {open ? `${layerNames.join(" · ")} · ${names}` : "Off"}
        </span>
      </div>
      <p className="text-[10px] leading-snug text-subtle">
        {open
          ? "Modes below inherit onto every selected layer — including Brush Shadow."
          : "Pick a layer to open the mix. None selected — FX is idle."}
      </p>
      <div className="grid grid-cols-4 gap-1" role="group" aria-label="FX layers">
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
                "rounded-md border px-1 py-1.5 text-center text-[11px] font-medium leading-tight transition " +
                (on
                  ? "border-fg/70 bg-fg/15 text-fg"
                  : "border-line/60 text-muted hover:border-fg/40 hover:text-fg/80")
              }
            >
              {l.name}
            </button>
          );
        })}
      </div>
      {shadowOpen && (
        <div className="rounded-lg border border-line bg-fg/5 p-2">
          <BrushShadow nested />
        </div>
      )}
      {open && (
        <>
          <p className="text-[10px] leading-snug text-subtle">
            {active.length > 1
              ? `Stack: ${names}. Compatible modes mix; Darken and Lighten families replace each other.`
              : hints[0]}
          </p>
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
          <div className="flex flex-col gap-2">
            {BRUSH_FX_GROUPS.map((group) => (
              <div key={group.id} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
                    {group.label}
                  </span>
                  <span className="max-w-[62%] truncate text-[9px] text-subtle/80">{group.blurb}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {group.modes.map((m) => {
                    const on = active.includes(m.id);
                    const conflict = !on && fxConflictsWith(active, m.id);
                    return (
                      <label
                        key={m.id}
                        className={
                          "flex cursor-pointer items-start gap-2 rounded-lg px-1.5 py-1 " +
                          (on ? "bg-fg/12" : conflict ? "opacity-45 hover:bg-fg/6 hover:opacity-80" : "hover:bg-fg/6")
                        }
                        title={
                          conflict
                            ? `Replaces the ${active.some((id) => id === "darken" || id === "multiply") ? "Darken" : "Lighten"} stack`
                            : m.hint
                        }
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => setBrushFx(m.id)}
                          className="mt-0.5 size-3.5 shrink-0 accent-current"
                          aria-label={m.name}
                        />
                        <span className="min-w-0 leading-tight">
                          <span className="block text-[12px] text-fg/90">{m.name}</span>
                          {(on || conflict) && (
                            <span className="block text-[10px] text-muted">
                              {conflict ? "Cancels the opposite tone family" : m.hint}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export { LayerFxPicker as BrushFxPicker };
export type { BrushFxId };
