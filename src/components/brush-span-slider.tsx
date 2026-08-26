import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { DIA_MAX, DIA_MIN } from "@/lib/ripple/brushes";
import { useRippleStore } from "@/store/ripple";
import { TipMark } from "./tip-mark";

const RANGE = DIA_MAX - DIA_MIN;

function toT(v: number) {
  return Math.max(0, Math.min(1, (v - DIA_MIN) / RANGE));
}

function fromT(t: number) {
  return DIA_MIN + Math.max(0, Math.min(1, t)) * RANGE;
}

function label(n: number) {
  return Math.round(n * 200);
}

export function BrushSpanSlider() {
  const brushId = useRippleStore((s) => s.brushId);
  const min = useRippleStore((s) => s.getActiveSpan().min);
  const max = useRippleStore((s) => s.getActiveSpan().max);
  const span = { min, max };
  const setBrushSpan = useRippleStore((s) => s.setBrushSpan);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"min" | "max" | null>(null);
  const spanRef = useRef(span);
  spanRef.current = span;

  const clientXToT = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const which = dragging.current;
      if (!which) return;
      const t = clientXToT(e.clientX);
      const v = fromT(t);
      const cur = spanRef.current;
      if (which === "min") setBrushSpan({ min: Math.min(v, cur.max - 0.006), max: cur.max });
      else setBrushSpan({ min: cur.min, max: Math.max(v, cur.min + 0.006) });
    };
    const onUp = () => {
      dragging.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [clientXToT, setBrushSpan]);

  const begin = (which: "min" | "max") => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = which;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const minT = toT(span.min);
  const maxT = toT(span.max);

  return (
    <div className="flex flex-col gap-2" key={brushId}>
      <div className="flex justify-between text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          Diameter
          <TipMark id="diameter" />
        </span>
        <span className="font-mono tabular-nums text-fg">
          {label(span.min)}–{label(span.max)}
        </span>
      </div>
      <div
        ref={trackRef}
        className="relative h-8 w-full cursor-pointer touch-none"
        onPointerDown={(e) => {
          const t = clientXToT(e.clientX);
          const v = fromT(t);
          if (Math.abs(t - minT) <= Math.abs(t - maxT)) {
            dragging.current = "min";
            setBrushSpan({ min: Math.min(v, span.max - 0.006), max: span.max });
          } else {
            dragging.current = "max";
            setBrushSpan({ min: span.min, max: Math.max(v, span.min + 0.006) });
          }
        }}
      >
        <div className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-fg/10" />
        <div
          className="absolute top-1/2 -translate-y-1/2 bg-fg/35"
          style={{
            left: `${minT * 100}%`,
            width: `${Math.max(2, (maxT - minT) * 100)}%`,
            height: 10,
            clipPath: "polygon(0 32%, 100% 0, 100% 100%, 0 68%)",
            borderRadius: 2,
          }}
        />
        <button
          type="button"
          data-handle="min"
          aria-label="Smallest brush size"
          title={`Small ${label(span.min)}`}
          onPointerDown={begin("min")}
          className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-fg bg-ink"
          style={{ left: `${minT * 100}%`, width: 14, height: 14 }}
        />
        <button
          type="button"
          data-handle="max"
          aria-label="Largest brush size"
          title={`Large ${label(span.max)}`}
          onPointerDown={begin("max")}
          className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-fg bg-fg"
          style={{ left: `${maxT * 100}%`, width: 20, height: 20 }}
        />
      </div>
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-subtle">
        <span>Small</span>
        <span>Large</span>
      </div>
    </div>
  );
}
