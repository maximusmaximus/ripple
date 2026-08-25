import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  isCustomBrushId,
  MAX_CUSTOM_BRUSHES,
  MAX_BRUSH_NAME,
  newCustomBrushId,
  sanitizeBrushName,
  type CustomBrush,
} from "@/lib/ripple/brushes";
import { MAX_BRUSH_BYTES, readBrushPng } from "@/lib/ripple/brush-file";
import { useRippleStore } from "@/store/ripple";

export function CustomBrushMenu({ color }: { color: string }) {
  const brushId = useRippleStore((s) => s.brushId);
  const customBrushes = useRippleStore((s) => s.customBrushes);
  const setBrushId = useRippleStore((s) => s.setBrushId);
  const addCustomBrush = useRippleStore((s) => s.addCustomBrush);
  const updateCustomBrush = useRippleStore((s) => s.updateCustomBrush);
  const removeCustomBrush = useRippleStore((s) => s.removeCustomBrush);
  const fileRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const active = customBrushes.find((c) => c.id === brushId) ?? null;
  const selected = isCustomBrushId(brushId);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (customBrushes.length >= MAX_CUSTOM_BRUSHES) {
      setErr(`Cap is ${MAX_CUSTOM_BRUSHES} custom brushes.`);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const loaded = await readBrushPng(file);
      const name = sanitizeBrushName(file.name.replace(/\.png$/i, "")) || "Stamp";
      const brush: CustomBrush = {
        id: newCustomBrushId(),
        name,
        mime: "image/png",
        dataUrl: loaded.dataUrl,
        width: loaded.width,
        height: loaded.height,
        angle: 0,
        spin: 0,
      };
      addCustomBrush(brush);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not use that PNG.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-1.5 pt-0.5">
      <div className="flex items-baseline justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
        <span>Custom</span>
        <span className="font-normal normal-case tracking-normal text-subtle/80">
          Transparent PNG · {Math.round(MAX_BRUSH_BYTES / 1024)} KB max
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1" role="listbox" aria-label="Custom brushes">
        {customBrushes.map((b) => {
          const on = b.id === brushId;
          return (
            <button
              key={b.id}
              type="button"
              role="option"
              aria-selected={on}
              title={b.name}
              onClick={() => setBrushId(b.id)}
              className={
                "flex flex-col items-center gap-0.5 rounded-md px-0.5 py-1 transition " +
                (on ? "bg-fg/12 text-fg" : "text-muted hover:bg-fg/6 hover:text-fg/80")
              }
            >
              <span
                className={
                  "relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border " +
                  (on ? "border-fg/50" : "border-line/50")
                }
                style={{ background: "rgb(8 8 12 / 0.85)" }}
              >
                <img
                  src={b.dataUrl}
                  alt=""
                  className="max-h-[80%] max-w-[80%] object-contain"
                  style={{
                    transform: `rotate(${b.angle}deg)`,
                    filter: `drop-shadow(0 0 0.5px ${color})`,
                  }}
                />
              </span>
              <span className="max-w-full truncate text-[9px] font-medium leading-tight tracking-wide">
                {b.name}
              </span>
            </button>
          );
        })}
        {customBrushes.length < MAX_CUSTOM_BRUSHES && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            title="Upload a transparent PNG"
            className="flex flex-col items-center gap-0.5 rounded-md px-0.5 py-1 text-muted hover:bg-fg/6 hover:text-fg/80 disabled:opacity-40"
          >
            <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border border-dashed border-line/70">
              <Plus className="size-3.5" strokeWidth={2.2} />
            </span>
            <span className="text-[9px] font-medium leading-tight tracking-wide">
              {busy ? "…" : "Add"}
            </span>
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,.png"
        className="sr-only"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      {err && <p className="text-[10px] text-red-300/90">{err}</p>}
      {selected && active && (
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-fg/5 p-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.14em] text-subtle">Name</span>
            <input
              value={active.name}
              maxLength={MAX_BRUSH_NAME}
              onChange={(e) => updateCustomBrush(active.id, { name: sanitizeBrushName(e.target.value) })}
              className="rounded-md border border-line bg-ink/60 px-2 py-1.5 text-[12px] text-fg outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[12px] text-muted">
              <span>Angle</span>
              <span className="font-mono tabular-nums text-fg">{Math.round(active.angle)}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={active.angle}
              onChange={(e) => updateCustomBrush(active.id, { angle: parseFloat(e.target.value) })}
              className="w-full"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[12px] text-muted">
              <span>Rotation speed</span>
              <span className="font-mono tabular-nums text-fg">{active.spin.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={8}
              step={0.1}
              value={active.spin}
              onChange={(e) => updateCustomBrush(active.id, { spin: parseFloat(e.target.value) })}
              className="w-full"
            />
          </label>
          <button
            type="button"
            onClick={() => removeCustomBrush(active.id)}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-line py-1.5 text-[11px] text-muted hover:bg-fg/10 hover:text-fg"
          >
            <Trash2 className="size-3" />
            Remove stamp
          </button>
        </div>
      )}
    </div>
  );
}
