import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { paletteGradient, samplePalette } from "@/lib/ripple/palettes";
import { useRippleStore } from "@/store/ripple";

export function ColorRangeSlider() {
  const worldId = useRippleStore((s) => s.worldId);
  const palette = useRippleStore((s) => s.getActivePalette());
  const storedRange = useRippleStore((s) => s.colorRanges[s.worldId]);
  const setColorRange = useRippleStore((s) => s.setColorRange);
  const resetColorRange = useRippleStore((s) => s.resetColorRange);

  const def = palette.defaultRange;
  const start = storedRange ? Math.min(storedRange.start, storedRange.end) : def[0];
  const end = storedRange ? Math.max(storedRange.start, storedRange.end) : def[1];

  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"start" | "end" | null>(null);
  const rangeRef = useRef({ start, end });
  rangeRef.current = { start, end };

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
      const r = rangeRef.current;
      if (which === "start") setColorRange({ start: t, end: r.end });
      else setColorRange({ start: r.start, end: t });
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
  }, [clientXToT, setColorRange]);

  const beginDrag = (which: "start" | "end") => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = which;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onTrackPointerDown = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).dataset.handle) return;
    const t = clientXToT(e.clientX);
    if (Math.abs(t - start) <= Math.abs(t - end)) {
      setColorRange({ start: t, end });
      dragging.current = "start";
    } else {
      setColorRange({ start, end: t });
      dragging.current = "end";
    }
  };

  const fullGradient = paletteGradient(palette.colors);
  const startColor = samplePalette(palette.colors, start);
  const endColor = samplePalette(palette.colors, end);
  const isDefault = Math.abs(start - def[0]) < 0.015 && Math.abs(end - def[1]) < 0.015;

  return (
    <div className="flex flex-col gap-2 select-none" key={worldId}>
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted">
        <span>Color range</span>
        <button
          type="button"
          onClick={resetColorRange}
          disabled={isDefault}
          className="text-[10px] text-subtle hover:text-fg disabled:opacity-25"
        >
          Reset
        </button>
      </div>

      <div
        ref={trackRef}
        onPointerDown={onTrackPointerDown}
        className="relative w-full cursor-pointer touch-none rounded-full"
        style={{
          height: 44,
          minHeight: 44,
          background: fullGradient,
          boxShadow: "inset 0 1px 4px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.2)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-0 rounded-l-full bg-ink/55"
          style={{ width: `${start * 100}%` }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 rounded-r-full bg-ink/55"
          style={{ width: `${(1 - end) * 100}%` }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 border-y-2 border-fg/35"
          style={{ left: `${start * 100}%`, width: `${Math.max(2, (end - start) * 100)}%` }}
        />

        <div
          data-handle="start"
          onPointerDown={beginDrag("start")}
          className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-[3px] border-fg active:scale-110"
          style={{
            left: `${start * 100}%`,
            width: 28,
            height: 28,
            backgroundColor: startColor,
            boxShadow: `0 0 0 3px ${startColor}55, 0 2px 8px rgba(0,0,0,0.55)`,
          }}
        />
        <div
          data-handle="end"
          onPointerDown={beginDrag("end")}
          className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-[3px] border-fg active:scale-110"
          style={{
            left: `${end * 100}%`,
            width: 28,
            height: 28,
            backgroundColor: endColor,
            boxShadow: `0 0 0 3px ${endColor}55, 0 2px 8px rgba(0,0,0,0.55)`,
          }}
        />
      </div>

      <div className="flex justify-between font-mono text-[10px] tabular-nums text-subtle">
        <span>{(start * 100).toFixed(0)}%</span>
        <span className="text-subtle/80">
          {palette.name} · {((end - start) * 100) | 0}% window
        </span>
        <span>{(end * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}
