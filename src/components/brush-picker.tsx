import { BRUSHES, SCRIPT_BRUSHES, getBrush, type BrushId, type BrushKind, type BrushFeel } from "@/lib/ripple/brushes";
import { useRippleStore } from "@/store/ripple";
import { CustomBrushMenu } from "./custom-brushes";

function Mark({
  kind,
  radius,
  force,
  feel,
  color,
}: {
  kind: BrushKind;
  radius: number;
  force: number;
  feel?: BrushFeel;
  color: string;
}) {
  const sizePct = 22 + (radius / 0.09) * 78;
  const opacity = 0.32 + force * 0.68;
  const spray = kind === "scatter";
  const soft = kind === "soft";
  const script = kind === "nib" || (feel && feel !== "steady");
  if (spray) {
    return (
      <span className="relative flex h-8 w-8 items-center justify-center" style={{ color }}>
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
    const rot = kind === "nib" ? 45 : feel === "taper" ? 18 : feel === "swell" ? -12 : feel === "pulse" ? 8 : 28;
    const w = feel === "taper" ? 2.6 : feel === "pulse" ? 5 : feel === "press" ? 4.5 : 3.6;
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
        width: `${sizePct.toFixed(1)}%`,
        height: `${sizePct.toFixed(1)}%`,
        opacity: Number(opacity.toFixed(3)),
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
}: {
  brushes: typeof BRUSHES;
  active: string;
  onPick: (id: BrushId) => void;
  label: string;
  color: string;
}) {
  return (
    <div className="grid grid-cols-4 gap-1" role="listbox" aria-label={label}>
      {brushes.map((b) => {
        const selected = b.id === active;
        return (
          <button
            key={b.id}
            type="button"
            role="option"
            aria-selected={selected}
            title={`${b.name} — ${b.hint}`}
            onClick={() => onPick(b.id as BrushId)}
            className={
              "flex flex-col items-center gap-0.5 rounded-md px-0.5 py-1 transition " +
              (selected ? "bg-fg/12 text-fg" : "text-muted hover:bg-fg/6 hover:text-fg/80")
            }
          >
            <span
              className={
                "relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border " +
                (selected ? "border-fg/50" : "border-line/50")
              }
              style={{ background: "rgb(8 8 12 / 0.85)" }}
            >
              <Mark kind={b.kind} radius={b.radius} force={b.force} feel={b.feel} color={color} />
            </span>
            <span className="max-w-full truncate text-[9px] font-medium leading-tight tracking-wide">
              {b.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function BrushPicker() {
  const brushId = useRippleStore((s) => s.brushId);
  const setBrushId = useRippleStore((s) => s.setBrushId);
  const customBrushes = useRippleStore((s) => s.customBrushes);
  const pairKey = useRippleStore((s) => s.getActivePair().key);
  const color = pairKey;
  const name = getBrush(brushId, customBrushes).name;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          Brushes
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
        brushes={BRUSHES}
        active={brushId}
        onPick={setBrushId}
        label="Brush presets"
        color={color}
      />
      <div className="flex items-baseline justify-between pt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
        <span>Script</span>
        <span className="font-normal normal-case tracking-normal text-subtle/80">
          Diameter follows the stroke
        </span>
      </div>
      <BrushGrid
        brushes={SCRIPT_BRUSHES}
        active={brushId}
        onPick={setBrushId}
        label="Calligraphy brushes"
        color={color}
      />
      <CustomBrushMenu color={color} />
    </div>
  );
}
