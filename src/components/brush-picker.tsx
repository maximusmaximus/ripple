import { BRUSHES, SCRIPT_BRUSHES, ALL_BRUSHES, type BrushId, type BrushKind, type BrushFeel } from "@/lib/ripple/brushes";
import { useRippleStore } from "@/store/ripple";

function Mark({
  kind,
  radius,
  force,
  feel,
}: {
  kind: BrushKind;
  radius: number;
  force: number;
  feel?: BrushFeel;
}) {
  const sizePct = 22 + (radius / 0.09) * 78;
  const opacity = 0.28 + force * 0.7;
  const spray = kind === "scatter";
  const soft = kind === "soft";
  const script = kind === "nib" || (feel && feel !== "steady");
  if (spray) {
    return (
      <span className="relative flex h-7 w-7 items-center justify-center">
        {[0, 1, 2, 3, 4].map((i) => {
          const ang = (i / 5) * Math.PI * 2;
          const r = 4 + radius * 18;
          const d = (2.5 + radius * 12).toFixed(1);
          return (
            <span
              key={i}
              className="absolute rounded-full bg-current"
              style={{
                width: `${d}px`,
                height: `${d}px`,
                opacity: Number(opacity.toFixed(3)),
                transform: `translate(${(Math.cos(ang) * r).toFixed(2)}px, ${(Math.sin(ang) * r).toFixed(2)}px)`,
              }}
            />
          );
        })}
        <span
          className="rounded-full bg-current"
          style={{ width: "3.5px", height: "3.5px", opacity: Number(opacity.toFixed(3)) }}
        />
      </span>
    );
  }
  if (script) {
    const rot = kind === "nib" ? 45 : feel === "taper" ? 18 : feel === "swell" ? -12 : 28;
    const w = feel === "taper" ? 3 : feel === "pulse" ? 5 : 4;
    const h = 2 + (radius / 0.04) * 8;
    return (
      <span
        className="rounded-full bg-current"
        style={{
          width: `${w.toFixed(1)}px`,
          height: `${h.toFixed(1)}px`,
          opacity: Number(opacity.toFixed(3)),
          transform: `rotate(${rot}deg)`,
          filter: soft ? "blur(0.5px)" : undefined,
        }}
      />
    );
  }
  return (
    <span
      className="rounded-full bg-current"
      style={{
        width: `${sizePct.toFixed(1)}%`,
        height: `${sizePct.toFixed(1)}%`,
        opacity: Number(opacity.toFixed(3)),
        filter: soft ? "blur(0.7px)" : undefined,
        boxShadow: soft ? "0 0 5px currentColor" : undefined,
      }}
    />
  );
}

function BrushRow({
  brushes,
  active,
  onPick,
  label,
}: {
  brushes: typeof BRUSHES;
  active: BrushId;
  onPick: (id: BrushId) => void;
  label: string;
}) {
  return (
    <div
      className="grid grid-cols-8 gap-y-1"
      role="listbox"
      aria-label={label}
    >
      {brushes.map((b) => {
        const selected = b.id === active;
        return (
          <button
            key={b.id}
            type="button"
            role="option"
            aria-selected={selected}
            title={b.name}
            onClick={() => onPick(b.id)}
            className={
              "flex h-8 items-center justify-center text-fg/80 transition " +
              (selected ? "text-fg" : "text-muted hover:text-fg/80")
            }
          >
            <span
              className={
                "relative flex h-7 w-7 items-center justify-center " +
                (selected ? "scale-110" : "")
              }
            >
              <Mark kind={b.kind} radius={b.radius} force={b.force} feel={b.feel} />
              {selected && (
                <span className="absolute -bottom-0.5 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full bg-fg" />
              )}
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
  const active: BrushId = brushId;
  const name = ALL_BRUSHES.find((b) => b.id === active)?.name ?? "Ink";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-[12px] text-muted">
        <span>Brush</span>
        <span className="text-[11px] font-medium text-fg/80">{name}</span>
      </div>
      <BrushRow brushes={BRUSHES} active={active} onPick={setBrushId} label="Brush presets" />
      <div className="flex items-baseline justify-between pt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
        <span>Script</span>
        <span className="font-normal normal-case tracking-normal text-subtle/80">
          Diameter follows the stroke
        </span>
      </div>
      <BrushRow
        brushes={SCRIPT_BRUSHES}
        active={active}
        onPick={setBrushId}
        label="Calligraphy brushes"
      />
    </div>
  );
}
