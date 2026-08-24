import {
  BRUSH_FX_GROUPS,
  asFxList,
  fxConflictsWith,
  getBrushFx,
  type BrushFxId,
} from "@/lib/ripple/blend";
import { getBrush } from "@/lib/ripple/brushes";
import { useRippleStore } from "@/store/ripple";

export function BrushFxPicker() {
  const brushId = useRippleStore((s) => s.brushId);
  const fxSig = useRippleStore((s) => asFxList(s.brushFx[s.brushId]).join(","));
  const active = asFxList(fxSig.split(",") as BrushFxId[]);
  const setBrushFx = useRippleStore((s) => s.setBrushFx);
  const fxOpacity = useRippleStore((s) => s.brushFxOpacity);
  const setBrushFxOpacity = useRippleStore((s) => s.setBrushFxOpacity);
  const brush = getBrush(brushId);
  const names = active.map((id) => getBrushFx(id).name).join(" · ");
  const hints = active.map((id) => getBrushFx(id).hint);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-[12px] text-muted">
        <span>Brush FX</span>
        <span className="max-w-[70%] truncate text-right text-[11px] font-medium text-fg/80">
          {brush.name} · {names}
        </span>
      </div>
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
    </div>
  );
}

export type { BrushFxId };
