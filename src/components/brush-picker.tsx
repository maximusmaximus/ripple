import { useRef, useState } from "react";
import { X } from "lucide-react";
import { BRUSHES, SCRIPT_BRUSHES, getBrush, isCustomBrushId, type BrushFeel, type BrushKind, type BrushPreset } from "@/lib/ripple/brushes";
import { useRippleStore } from "@/store/ripple";
import { CustomBrushMenu } from "./custom-brushes";
import { TipMark, TipCopy } from "./tip-mark";

const HOLD_MS = 2000;

function Mark({
  kind,
  radius,
  force,
  feel,
  color,
  angle,
  width,
}: {
  kind: BrushKind;
  radius: number;
  force: number;
  feel?: BrushFeel;
  color: string;
  angle: number;
  width: number;
}) {
  const sizePct = 22 + (radius / 0.09) * 78;
  const opacity = 0.32 + force * 0.68;
  const spray = kind === "scatter";
  const soft = kind === "soft";
  const script = kind === "nib" || (feel && feel !== "steady");
  const squash = Math.max(0.18, Math.min(1, width));
  if (spray) {
    return (
      <span className="relative flex h-8 w-8 items-center justify-center" style={{ color, transform: `rotate(${angle}deg) scaleX(${squash})` }}>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const ang = (i / 6) * Math.PI * 2;
          const r = 3.2 + radius * 16;
          const d = (2.2 + radius * 10).toFixed(1);
          return (
            <span
              key={i}
              className="absolute rounded-full bg-current"
              style={{
                width: `${d}px`,
                height: `${d}px`,
                opacity: Number((opacity * (0.55 + (i % 3) * 0.15)).toFixed(3)),
                transform: `translate(${(Math.cos(ang) * r).toFixed(2)}px, ${(Math.sin(ang) * r).toFixed(2)}px)`,
              }}
            />
          );
        })}
        <span
          className="rounded-full bg-current"
          style={{ width: "3px", height: "3px", opacity: Number(opacity.toFixed(3)) }}
        />
      </span>
    );
  }
  if (script) {
    const rot = kind === "nib" ? angle : feel === "taper" ? 18 : feel === "swell" ? -12 : feel === "pulse" ? 8 : 28;
    const w = (feel === "taper" ? 2.6 : feel === "pulse" ? 5 : feel === "press" ? 4.5 : 3.6) * squash;
    const h = 6 + (radius / 0.04) * 10;
    return (
      <span
        className="rounded-full bg-current"
        style={{
          color,
          width: `${w.toFixed(1)}px`,
          height: `${h.toFixed(1)}px`,
          opacity: Number(opacity.toFixed(3)),
          transform: `rotate(${rot}deg)`,
          filter: soft ? "blur(0.6px)" : undefined,
          boxShadow: feel === "pulse" ? `0 0 6px ${color}` : undefined,
        }}
      />
    );
  }
  return (
    <span
      className="rounded-full bg-current"
      style={{
        color,
        width: `${(sizePct * squash).toFixed(1)}%`,
        height: `${sizePct.toFixed(1)}%`,
        opacity: Number(opacity.toFixed(3)),
        transform: `rotate(${angle}deg)`,
        filter: soft ? "blur(0.85px)" : undefined,
        boxShadow: soft ? `0 0 6px ${color}` : undefined,
      }}
    />
  );
}

function BrushGrid({
  brushes,
  active,
  onPick,
  label,
  color,
  armedId,
  onArm,
  onAskDelete,
}: {
  brushes: BrushPreset[];
  active: string;
  onPick: (id: string) => void;
  label: string;
  color: string;
  armedId: string | null;
  onArm: (id: string) => void;
  onAskDelete: (id: string) => void;
}) {
  const holdTimer = useRef<number | null>(null);
  const held = useRef(false);
  const clearHold = () => {
    if (holdTimer.current != null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  return (
    <div className="grid grid-cols-4 gap-1" role="listbox" aria-label={label}>
      {brushes.map((b) => {
        const selected = b.id === active;
        const armed = armedId === b.id;
        return (
          <div key={b.id} className="relative min-w-0">
            <button
              type="button"
              role="option"
              aria-selected={selected}
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
                onPick(b.id);
              }}
              className={
                "flex w-full flex-col items-center gap-0.5 rounded-md px-0.5 py-1 transition " +
                (selected ? "bg-fg/12 text-fg" : armed ? "bg-fg/10 text-fg" : "text-muted hover:bg-fg/6 hover:text-fg/80")
              }
            >
              <span
                className={
                  "relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border " +
                  (selected ? "border-fg/50" : "border-line/50")
                }
                style={{ background: "rgb(8 8 12 / 0.85)" }}
              >
                <Mark
                  kind={b.kind}
                  radius={b.radius}
                  force={b.force}
                  feel={b.feel}
                  color={color}
                  angle={b.angle}
                  width={b.width}
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
    </div>
  );
}

export function BrushPicker() {
  const brushId = useRippleStore((s) => s.brushId);
  const setBrushId = useRippleStore((s) => s.setBrushId);
  const customBrushes = useRippleStore((s) => s.customBrushes);
  const hiddenBrushIds = useRippleStore((s) => s.hiddenBrushIds);
  const hideBrush = useRippleStore((s) => s.hideBrush);
  const shapeAngle = useRippleStore((s) => s.getActiveShape().angle);
  const shapeWidth = useRippleStore((s) => s.getActiveShape().width);
  const setBrushShape = useRippleStore((s) => s.setBrushShape);
  const pairKey = useRippleStore((s) => s.getActivePair().key);
  const color = pairKey;
  const name = getBrush(brushId, customBrushes).name;
  const [armedId, setArmedId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const visibleRounds = BRUSHES.filter((b) => !hiddenBrushIds.includes(b.id));
  const visibleScript = SCRIPT_BRUSHES.filter((b) => !hiddenBrushIds.includes(b.id));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          Brushes
          <TipMark id="brushes" />
          <span
            className="inline-block size-2.5 rounded-full border border-line"
            style={{ background: color }}
            title="Stroke color"
            aria-hidden
          />
        </span>
        <span className="text-[11px] font-medium text-fg/80">{name}</span>
      </div>
      <BrushGrid
        brushes={visibleRounds}
        active={brushId}
        onPick={setBrushId}
        label="Brush presets"
        color={color}
        armedId={armedId}
        onArm={setArmedId}
        onAskDelete={setConfirmId}
      />
      <div className="flex items-baseline justify-between pt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
        <span>Script</span>
        <TipCopy className="font-normal normal-case tracking-normal text-subtle/80">
          Diameter follows the stroke
        </TipCopy>
      </div>
      <BrushGrid
        brushes={visibleScript}
        active={brushId}
        onPick={setBrushId}
        label="Calligraphy brushes"
        color={color}
        armedId={armedId}
        onArm={setArmedId}
        onAskDelete={setConfirmId}
      />
      <div className="flex flex-col gap-2 rounded-lg border border-line bg-fg/5 p-2">
        <div className="flex items-baseline justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
          <span className="inline-flex items-center gap-1.5">
            Rotation & blade
            <TipMark id="brush-shape" />
          </span>
        </div>
        <label className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[12px] text-muted">
            <span>Rotation</span>
            <span className="font-mono tabular-nums text-fg">{Math.round(shapeAngle)}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={shapeAngle}
            onChange={(e) => setBrushShape({ angle: parseFloat(e.target.value) })}
            className="w-full"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[12px] text-muted">
            <span>Blade</span>
            <span className="font-mono tabular-nums text-fg">{Math.round(shapeWidth * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.18}
            max={1}
            step={0.01}
            value={shapeWidth}
            onChange={(e) => setBrushShape({ width: parseFloat(e.target.value) })}
            className="w-full"
          />
        </label>
      </div>
      <CustomBrushMenu color={color} armedId={armedId} onArm={setArmedId} onAskDelete={setConfirmId} />
      {confirmId && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-fg/8 px-2 py-1.5">
          <p className="text-[10px] text-fg/90">
            {isCustomBrushId(confirmId) ? "Delete this stamp?" : "Hide this starter brush?"}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                setConfirmId(null);
                setArmedId(null);
              }}
              className="rounded-md px-2 py-1 text-[10px] text-muted hover:text-fg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                hideBrush(confirmId);
                setConfirmId(null);
                setArmedId(null);
              }}
              className="rounded-md bg-fg/15 px-2 py-1 text-[10px] font-medium text-fg hover:bg-fg/25"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
