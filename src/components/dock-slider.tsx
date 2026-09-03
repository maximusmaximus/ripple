import { PIN_META, type PinId } from "@/lib/ripple/pins";
import { DockPin } from "./dock-pin";
import { TipMark } from "./tip-mark";

export function DockSlider({
  pinId,
  tipId,
  pinTip,
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  pinId: PinId;
  tipId?: string;
  pinTip?: boolean;
  label?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
}) {
  const meta = PIN_META[pinId];
  const lo = min ?? meta.min;
  const hi = max ?? meta.max;
  const inc = step ?? meta.step;
  const shown = (format ?? meta.format)(value);
  return (
    <div className="flex flex-col gap-2" data-dock-slider={pinId}>
      <div className="flex justify-between text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          {label ?? meta.label}
          {tipId ? <TipMark id={tipId} /> : null}
        </span>
        <span className="font-mono tabular-nums text-fg">{shown}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={lo}
          max={hi}
          step={inc}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="min-w-0 flex-1"
          aria-label={label ?? meta.label}
          suppressHydrationWarning
        />
        <DockPin id={pinId} showTip={pinTip} />
      </div>
    </div>
  );
}
