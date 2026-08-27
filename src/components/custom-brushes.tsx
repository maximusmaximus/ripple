import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  MAX_CUSTOM_BRUSHES,
  MAX_BRUSH_NAME,
  newCustomBrushId,
  sanitizeBrushName,
  type CustomBrush,
} from "@/lib/ripple/brushes";
import { MAX_BRUSH_BYTES, readBrushPng } from "@/lib/ripple/brush-file";
import { mediaSrc } from "@/lib/ripple/studio";
import { useRippleStore } from "@/store/ripple";
import { TipCopy } from "./tip-mark";

const HOLD_MS = 2000;

type Draft = {
  name: string;
  mime: "image/png";
  dataUrl: string;
  width: number;
  height: number;
  angle: number;
  markWidth: number;
  spin: number;
};

export function CustomBrushMenu({
  color,
  armedId,
  onArm,
  onAskDelete,
}: {
  color: string;
  armedId: string | null;
  onArm: (id: string) => void;
  onAskDelete: (id: string) => void;
}) {
  const brushId = useRippleStore((s) => s.brushId);
  const customBrushes = useRippleStore((s) => s.customBrushes);
  const setBrushId = useRippleStore((s) => s.setBrushId);
  const addCustomBrush = useRippleStore((s) => s.addCustomBrush);
  const fileRef = useRef<HTMLInputElement>(null);
  const holdTimer = useRef<number | null>(null);
  const held = useRef(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const clearHold = () => {
    if (holdTimer.current != null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

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
      setDraft({
        name,
        mime: "image/png",
        dataUrl: loaded.dataUrl,
        width: loaded.width,
        height: loaded.height,
        angle: 0,
        markWidth: 1,
        spin: 0,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not use that PNG.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const commitDraft = () => {
    if (!draft) return;
    const brush: CustomBrush = {
      id: newCustomBrushId(),
      name: sanitizeBrushName(draft.name) || "Stamp",
      mime: "image/png",
      dataUrl: draft.dataUrl,
      width: draft.width,
      height: draft.height,
      angle: draft.angle,
      markWidth: draft.markWidth,
      spin: draft.spin,
    };
    addCustomBrush(brush);
    setDraft(null);
  };

  return (
    <div className="flex flex-col gap-1.5 pt-0.5">
      <div className="flex items-baseline justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
        <span>Custom</span>
        <TipCopy className="font-normal normal-case tracking-normal text-subtle/80">
          Transparent PNG · {Math.round(MAX_BRUSH_BYTES / 1024)} KB max
        </TipCopy>
      </div>
      <div className="grid grid-cols-4 gap-1" role="listbox" aria-label="Custom brushes">
        {customBrushes.map((b) => {
          const on = b.id === brushId;
          const armed = armedId === b.id;
          return (
            <div key={b.id} className="relative min-w-0">
              <button
                type="button"
                role="option"
                aria-selected={on}
                title={`${b.name} — hold to remove`}
                onPointerDown={() => {
                  held.current = false;
                  clearHold();
                  holdTimer.current = window.setTimeout(() => {
                    held.current = true;
                    onArm(b.id);
                  }, HOLD_MS);
                }}
                onPointerUp={clearHold}
                onPointerCancel={clearHold}
                onPointerLeave={clearHold}
                onClick={() => {
                  if (held.current) {
                    held.current = false;
                    return;
                  }
                  setBrushId(b.id);
                }}
                className={
                  "flex w-full flex-col items-center gap-0.5 rounded-md px-0.5 py-1 transition " +
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
                    src={mediaSrc(b) ?? ""}
                    alt=""
                    className="max-h-[80%] max-w-[80%] object-contain"
                    style={{
                      transform: `rotate(${b.angle}deg) scaleX(${b.markWidth ?? 1})`,
                      filter: `drop-shadow(0 0 0.5px ${color})`,
                    }}
                  />
                </span>
                <span className="max-w-full truncate text-[9px] font-medium leading-tight tracking-wide">
                  {b.name}
                </span>
              </button>
              {armed && (
                <button
                  type="button"
                  aria-label={`Delete ${b.name}`}
                  onClick={() => onAskDelete(b.id)}
                  className="absolute -right-1 -top-1 z-10 flex size-4 items-center justify-center rounded-full bg-fg text-ink"
                >
                  <X className="size-2.5" strokeWidth={3} />
                </button>
              )}
            </div>
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
        suppressHydrationWarning
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      {err && <p className="text-[10px] text-red-300/90">{err}</p>}
      {draft && (
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-fg/5 p-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-subtle">Set rotation & width</p>
          <div className="flex items-center gap-2">
            <span
              className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border border-line"
              style={{ background: "rgb(8 8 12 / 0.85)" }}
            >
              <img
                src={draft.dataUrl}
                alt=""
                className="max-h-[80%] max-w-[80%] object-contain"
                style={{ transform: `rotate(${draft.angle}deg) scaleX(${draft.markWidth})` }}
              />
            </span>
            <input
              value={draft.name}
              maxLength={MAX_BRUSH_NAME}
              onChange={(e) => setDraft({ ...draft, name: sanitizeBrushName(e.target.value) })}
              className="min-w-0 flex-1 rounded-md border border-line bg-ink/60 px-2 py-1.5 text-[12px] text-fg outline-none"
              placeholder="Stamp name"
            />
          </div>
          <label className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[12px] text-muted">
              <span>Rotation</span>
              <span className="font-mono tabular-nums text-fg">{Math.round(draft.angle)}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={draft.angle}
              onChange={(e) => setDraft({ ...draft, angle: parseFloat(e.target.value) })}
              className="w-full"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[12px] text-muted">
              <span>Width</span>
              <span className="font-mono tabular-nums text-fg">{Math.round(draft.markWidth * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.18}
              max={1}
              step={0.01}
              value={draft.markWidth}
              onChange={(e) => setDraft({ ...draft, markWidth: parseFloat(e.target.value) })}
              className="w-full"
            />
          </label>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="flex-1 rounded-md border border-line py-1.5 text-[11px] text-muted hover:text-fg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={commitDraft}
              className="flex-1 rounded-md bg-fg/15 py-1.5 text-[11px] font-medium text-fg hover:bg-fg/25"
            >
              Add brush
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
