import { useRippleStore } from "@/store/ripple";
import { TipMark, TipCopy } from "./tip-mark";
import { SpanProfile } from "./brush-span-slider";

export function BrushShadowPanel() {
  const on = useRippleStore((s) => s.shadowOn);
  const angle = useRippleStore((s) => s.shadowAngle);
  const dist = useRippleStore((s) => s.shadowDist);
  const start = useRippleStore((s) => s.shadowSpan.start);
  const mid = useRippleStore((s) => s.shadowSpan.mid);
  const end = useRippleStore((s) => s.shadowSpan.end);
  const setOn = useRippleStore((s) => s.setShadowOn);
  const setAngle = useRippleStore((s) => s.setShadowAngle);
  const setDist = useRippleStore((s) => s.setShadowDist);
  const setSpan = useRippleStore((s) => s.setShadowSpan);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          Brush shadow
          <TipMark id="shadow" />
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => setOn(!on)}
          className={
            "flex h-7 w-11 shrink-0 items-center rounded-full border p-0.5 transition " +
            (on ? "border-fg/70 bg-fg/25" : "border-line bg-fg/8")
          }
        >
          <span
            className={
              "size-5 rounded-full bg-fg shadow-sm transition-transform " +
              (on ? "translate-x-4" : "translate-x-0")
            }
          />
        </button>
      </div>
      {on && (
        <>
          <TipCopy>Color and opacity live on the large diamond on Width · Color. Distance and angle sit here.</TipCopy>
          <SpanProfile
            title="Shadow width"
            tipId="shadow"
            start={start}
            mid={mid}
            end={end}
            onChange={setSpan}
            fillClass="text-fg/28"
          />
          <label className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[12px] text-muted">
              <span>Distance</span>
              <span className="font-mono tabular-nums text-fg">{Math.round(dist * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={dist}
              onChange={(e) => setDist(parseFloat(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[12px] text-muted">
              <span>Angle</span>
              <span className="flex items-center gap-1.5 font-mono tabular-nums text-fg">
                <span
                  aria-hidden
                  className="inline-block size-2 rounded-[1px] bg-fg/80"
                  style={{ transform: `rotate(${angle}deg)` }}
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
        </>
      )}
    </div>
  );
}
