import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Minus, Plus } from "lucide-react";
import {
  gradientFromStops,
  sampleFromStops,
  stopsFromColors,
  MAX_COLOR_STOPS,
  MIN_COLOR_STOPS,
  type ColorStop,
} from "@/lib/ripple/palettes";
import { useRippleStore } from "@/store/ripple";

export function ColorRangeSlider() {
  const worldId = useRippleStore((s) => s.worldId);
  const palette = useRippleStore((s) => s.getActivePalette());
  const storedRange = useRippleStore((s) => s.colorRanges[s.worldId]);
  const setColorRange = useRippleStore((s) => s.setColorRange);
  const resetColorRange = useRippleStore((s) => s.resetColorRange);
  const customStops = useRippleStore((s) => s.colorStops[s.worldId]);
  const stops = useMemo(
    () =>
      customStops && customStops.length >= 2
        ? customStops
        : stopsFromColors(palette.colors, worldId),
    [customStops, palette.colors, worldId],
  );
  const addColorStop = useRippleStore((s) => s.addColorStop);
  const removeColorStop = useRippleStore((s) => s.removeColorStop);
  const updateColorStop = useRippleStore((s) => s.updateColorStop);
  const resetColorStops = useRippleStore((s) => s.resetColorStops);
  const hasCustomStops = useRippleStore((s) => Boolean(s.colorStops[s.worldId]?.length));

  const def = palette.defaultRange;
  const start = storedRange ? Math.min(storedRange.start, storedRange.end) : def[0];
  const end = storedRange ? Math.max(storedRange.start, storedRange.end) : def[1];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"start" | "end" | "stop" | null>(null);
  const dragStopId = useRef<string | null>(null);
  const rangeRef = useRef({ start, end });
  rangeRef.current = { start, end };

  useEffect(() => {
    setSelectedId(null);
  }, [worldId]);

  useEffect(() => {
    if (selectedId && !stops.some((s) => s.id === selectedId)) {
      setSelectedId(null);
    }
  }, [stops, selectedId]);

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
      if (which === "stop" && dragStopId.current) {
        updateColorStop(dragStopId.current, { t });
        return;
      }
      const r = rangeRef.current;
      if (which === "start") setColorRange({ start: t, end: r.end });
      else if (which === "end") setColorRange({ start: r.start, end: t });
    };
    const onUp = () => {
      dragging.current = null;
      dragStopId.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [clientXToT, setColorRange, updateColorStop]);

  const beginRangeDrag = (which: "start" | "end") => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = which;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const beginStopDrag = (stop: ColorStop) => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(stop.id);
    dragging.current = "stop";
    dragStopId.current = stop.id;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onTrackPointerDown = (e: ReactPointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.dataset.handle || target.dataset.stop) return;
    const t = clientXToT(e.clientX);
    if (Math.abs(t - start) <= Math.abs(t - end)) {
      setColorRange({ start: t, end });
      dragging.current = "start";
    } else {
      setColorRange({ start, end: t });
      dragging.current = "end";
    }
  };

  const fullGradient = gradientFromStops(stops);
  const startColor = sampleFromStops(stops, start);
  const endColor = sampleFromStops(stops, end);
  const isDefaultRange =
    Math.abs(start - def[0]) < 0.015 && Math.abs(end - def[1]) < 0.015;
  const selected = selectedId ? stops.find((s) => s.id === selectedId) : null;
  const canAdd = stops.length < MAX_COLOR_STOPS;
  const canRemove = Boolean(selected) && stops.length > MIN_COLOR_STOPS;
  const extraCount = Math.max(0, stops.length - palette.colors.length);

  return (
    <div className="flex flex-col gap-2 select-none" key={worldId}>
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted">
        <span>Color</span>
        <div className="flex items-center gap-2">
          {(hasCustomStops || !isDefaultRange) && (
            <button
              type="button"
              onClick={() => {
                resetColorRange();
                resetColorStops();
                setSelectedId(null);
              }}
              className="text-[10px] normal-case tracking-normal text-subtle hover:text-fg"
            >
              Reset
            </button>
          )}
          <button
            type="button"
            disabled={!canAdd}
            onClick={() => {
              addColorStop();
            }}
            className="inline-flex items-center gap-0.5 rounded-md bg-fg/10 px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-fg/90 hover:bg-fg/20 disabled:opacity-30"
            title={canAdd ? `Add stop (${stops.length}/${MAX_COLOR_STOPS})` : "Maximum stops reached"}
          >
            <Plus className="size-3" strokeWidth={2.25} />
            Stop
          </button>
        </div>
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

        {stops.map((stop) => {
          const active = stop.id === selectedId;
          return (
            <button
              key={stop.id}
              type="button"
              data-stop={stop.id}
              title={stop.color}
              onPointerDown={beginStopDrag(stop)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(stop.id);
              }}
              className={
                "absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 touch-none " +
                (active ? "scale-110" : "hover:scale-105")
              }
              style={{ left: `${stop.t * 100}%` }}
              aria-label={`Color stop ${stop.color}`}
              aria-pressed={active}
            >
              <span
                className={
                  "block h-4 w-4 rotate-45 rounded-[3px] border-2 shadow " +
                  (active
                    ? "border-white shadow-[0_0_0_2px_rgba(0,0,0,0.45)]"
                    : "border-white/80 shadow-black/40")
                }
                style={{ background: stop.color }}
              />
            </button>
          );
        })}

        <div
          data-handle="start"
          onPointerDown={beginRangeDrag("start")}
          className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
          style={{ left: `${start * 100}%` }}
        >
          <div
            className="h-7 w-3 rounded-full border-2 border-fg shadow-md"
            style={{ background: startColor }}
          />
        </div>
        <div
          data-handle="end"
          onPointerDown={beginRangeDrag("end")}
          className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
          style={{ left: `${end * 100}%` }}
        >
          <div
            className="h-7 w-3 rounded-full border-2 border-fg shadow-md"
            style={{ background: endColor }}
          />
        </div>
      </div>

      {selected && (
        <div className="flex items-center gap-2 rounded-xl border border-line bg-ink/40 px-2.5 py-2">
          <label className="relative flex h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-line shadow-inner">
            <span className="absolute inset-0" style={{ background: selected.color }} />
            <input
              type="color"
              value={normalizeHex(selected.color)}
              onChange={(e) => updateColorStop(selected.id, { color: e.target.value })}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Stop color"
            />
          </label>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-medium text-fg/90">Stop selected</div>
            <div className="font-mono text-[10px] tabular-nums text-muted">
              {normalizeHex(selected.color).toUpperCase()} · {Math.round(selected.t * 100)}%
            </div>
          </div>
          <button
            type="button"
            disabled={!canRemove}
            onClick={() => {
              removeColorStop(selected.id);
              setSelectedId(null);
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-fg/10 px-2 py-1.5 text-[11px] text-fg/90 hover:bg-red-500/20 hover:text-red-200 disabled:opacity-30"
            title={canRemove ? "Remove stop" : "Keep at least two stops"}
          >
            <Minus className="size-3.5" strokeWidth={2.25} />
            Remove
          </button>
        </div>
      )}

      {!selected && (
        <div className="flex justify-between text-[10px] text-subtle">
          <span>
            {stops.length} stops
            {extraCount > 0 ? ` · +${extraCount} extra` : ""}
            {canAdd ? ` · up to ${MAX_COLOR_STOPS - stops.length} more` : ""}
          </span>
          <span className="font-mono tabular-nums text-muted">
            {Math.round(start * 100)}–{Math.round(end * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}

function normalizeHex(c: string): string {
  const s = c.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toLowerCase();
  }
  return "#ffffff";
}
