import { useRippleStore } from "@/store/ripple";

export function BrushShadow({ nested = false }: { nested?: boolean }) {
  const on = useRippleStore((s) => s.shadowOn);
  const color = useRippleStore((s) => s.shadowColor);
  const angle = useRippleStore((s) => s.shadowAngle);
  const opacity = useRippleStore((s) => s.shadowOpacity);
  const setOn = useRippleStore((s) => s.setShadowOn);
  const setColor = useRippleStore((s) => s.setBrushShadowColor);
  const setAngle = useRippleStore((s) => s.setShadowAngle);
  const setOpacity = useRippleStore((s) => s.setShadowOpacity);
  const show = nested || on;

  return (
    <div className="flex flex-col gap-2">
      {!nested && (
        <label className="flex cursor-pointer items-center gap-2 text-[12px] text-muted">
          <input
            type="checkbox"
            checked={on}
            onChange={(e) => setOn(e.target.checked)}
            className="size-3.5 accent-fg"
          />
          <span className="font-medium text-fg/90">Brush shadow</span>
        </label>
      )}
      {nested && (
        <p className="text-[10px] leading-snug text-subtle">
          FX checkboxes mix into this cast. Color, angle, and opacity stay on the shadow itself.
        </p>
      )}
      {show && (
        <div className={"flex flex-col gap-2 " + (nested ? "" : "pl-5")}>
          <label className="flex items-center justify-between gap-2 text-[12px] text-muted">
            <span>Color</span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-7 w-10 cursor-pointer rounded border border-line bg-transparent p-0"
              aria-label="Shadow color"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[12px] text-muted">
              <span>Angle</span>
              <span className="flex items-center gap-1.5 font-mono tabular-nums text-fg">
                <span
                  aria-hidden
                  className="inline-block size-2 rounded-[1px] bg-fg/80"
                  style={{ transform: `rotate(${angle}deg)`, transformOrigin: "center" }}
                />
                {Math.round(angle)}°
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={angle}
              onChange={(e) => setAngle(parseFloat(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[12px] text-muted">
              <span>Opacity</span>
              <span className="font-mono tabular-nums text-fg">{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-full"
            />
          </label>
        </div>
      )}
    </div>
  );
}
