import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Minus } from "lucide-react";
import {
  gradientFromStops,
  sampleFromStops,
  resolvePair,
  defaultStopsFor,
  MAX_COLOR_STOPS,
  MIN_COLOR_STOPS,
  type ColorStop,
  stopAlpha,
} from "@/lib/ripple/palettes";
import { useRippleStore } from "@/store/ripple";
import { TipMark } from "./tip-mark";
import { ColorSwatchButton } from "./color-wheel";

export function ColorRangeSlider() {
  const worldId = useRippleStore((s) => s.worldId);
  const palette = useRippleStore((s) => s.getActivePalette());
  const storedRange = useRippleStore((s) => s.colorRanges[s.worldId]);
  const storedPair = useRippleStore((s) => s.colorPairs[s.worldId]);
  const customStops = useRippleStore((s) => s.colorStops[s.worldId]);
  const setColorRange = useRippleStore((s) => s.setColorRange);
  const setKeyColor = useRippleStore((s) => s.setKeyColor);
  const setShadowColor = useRippleStore((s) => s.setShadowColor);
  const resetColorRange = useRippleStore((s) => s.resetColorRange);
  const addColorStop = useRippleStore((s) => s.addColorStop);
  const removeColorStop = useRippleStore((s) => s.removeColorStop);
  const updateColorStop = useRippleStore((s) => s.updateColorStop);
  const gradientFlip = useRippleStore((s) => s.gradientFlip);
  const setGradientFlip = useRippleStore((s) => s.setGradientFlip);

  const def = palette.defaultRange;
  const start = storedRange ? Math.min(storedRange.start, storedRange.end) : def[0];
  const end = storedRange ? Math.max(storedRange.start, storedRange.end) : def[1];
  const pair = resolvePair(palette, storedPair);

  const stops = useMemo(() => {
    if (customStops && customStops.length >= 2) return customStops;
    return defaultStopsFor(palette, storedPair);
  }, [customStops, palette, storedPair]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"start" | "end" | "stop" | null>(null);
  const dragStopId = useRef<string | null>(null);
  const rangeRef = useRef({ start, end });
  rangeRef.current = { start, end };

  const stopIds = useMemo(() => stops.map((s) => s.id).join("|"), [stops]);

  useEffect(() => {
    setSelectedId(null);
  }, [worldId]);

  useEffect(() => {
    if (selectedId && !stopIds.split("|").includes(selectedId)) {
      setSelectedId(null);
    }
  }, [stopIds, selectedId]);

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
    e.preventDefault();
    const t = clientXToT(e.clientX);
    if (!canAdd) return;
    const id = addColorStop(t);
    if (!id) return;
    setSelectedId(id);
    dragging.current = "stop";
    dragStopId.current = id;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const fullGradient = gradientFromStops(stops);
  const startColor = sampleFromStops(stops, start);
  const endColor = sampleFromStops(stops, end);
  const rangeDefault = Math.abs(start - def[0]) < 0.015 && Math.abs(end - def[1]) < 0.015;
  const pairDefault = pair.key === palette.key && pair.shadow === palette.shadow;
  const hasCustomStops = Boolean(customStops && customStops.length >= 2);
  const isDefault = rangeDefault && pairDefault && !hasCustomStops;
  const selected = selectedId ? stops.find((s) => s.id === selectedId) : null;
  const canAdd = stops.length < MAX_COLOR_STOPS;
  const canRemove = Boolean(selected) && stops.length > MIN_COLOR_STOPS;
  const extraCount = Math.max(0, stops.length - 6);

  return (
    <div className="flex flex-col gap-2 select-none" key={worldId}>
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted">
        <span className="inline-flex items-center gap-1">
          Color
          <TipMark id="gradient" />
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetColorRange}
            disabled={isDefault}
            className="text-[10px] normal-case tracking-normal text-subtle hover:text-fg disabled:opacity-25"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2" title="Key color">
          <ColorSwatchButton value={pair.key} onChange={setKeyColor} label="Key" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[10px] font-medium uppercase tracking-wider text-subtle">Key</span>
            <span className="font-mono text-[9px] tabular-nums text-muted">{pair.key}</span>
          </span>
        </div>
        <div className="flex items-center gap-2" title="Shadow color">
          <ColorSwatchButton value={pair.shadow} onChange={setShadowColor} label="Shadow" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[10px] font-medium uppercase tracking-wider text-subtle">Shadow</span>
            <span className="font-mono text-[9px] tabular-nums text-muted">{pair.shadow}</span>
          </span>
        </div>
        <label className="flex min-w-0 flex-1 cursor-pointer flex-col gap-1 pb-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted">Flip Gradient</span>
          <button
            type="button"
            role="switch"
            aria-checked={gradientFlip}
            onClick={() => setGradientFlip(!gradientFlip)}
            className={
              "relative h-7 w-12 rounded-full border transition " +
              (gradientFlip ? "border-fg/70 bg-fg/25" : "border-line bg-fg/8")
            }
          >
            <span
              className={
                "absolute top-0.5 size-5 rounded-full bg-fg transition-transform " +
                (gradientFlip ? "translate-x-6" : "translate-x-0.5")
              }
            />
          </button>
        </label>
      </div>

      <div
        ref={trackRef}
        onPointerDown={onTrackPointerDown}
        className="relative mb-3 w-full cursor-copy touch-none rounded-full"
        title={canAdd ? "Click to add a stop" : "Maximum stops reached"}
        style={{
          height: 44,
          minHeight: 44,
          backgroundImage: `${fullGradient}, repeating-conic-gradient(#2a2a2a 0% 25%, #4a4a4a 0% 50%)`,
          backgroundSize: "auto, 8px 8px",
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
          const a = stopAlpha(stop);
          const hole = a < 0.08;
          return (
            <button
              key={stop.id}
              type="button"
              data-stop={stop.id}
              title={hole ? "Transparent stop" : stop.color}
              onPointerDown={beginStopDrag(stop)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(stop.id);
              }}
              className={
                "absolute z-20 -translate-x-1/2 touch-none " +
                (active ? "scale-110" : "hover:scale-105")
              }
              style={{ left: `${stop.t * 100}%`, bottom: "-7px" }}
              aria-label={hole ? "Transparent color stop" : `Color stop ${stop.color}`}
              aria-pressed={active}
            >
              <span
                className={
                  "block h-3.5 w-3.5 rotate-45 rounded-[2px] border-2 shadow " +
                  (active
                    ? "border-white shadow-[0_0_0_2px_rgba(0,0,0,0.45)]"
                    : "border-white/80 shadow-black/40")
                }
                style={{
                  background: hole
                    ? "repeating-conic-gradient(#d0d0d0 0% 25%, #555 0% 50%) 50% / 6px 6px"
                    : stop.color,
                  opacity: hole ? 1 : undefined,
                }}
              />
            </button>
          );
        })}

        <div
          data-handle="start"
          onPointerDown={beginRangeDrag("start")}
          className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-[3px] border-fg active:scale-110"
          style={{
            left: `${start * 100}%`,
            width: 22,
            height: 22,
            backgroundColor: startColor,
            boxShadow: `0 0 0 2px ${startColor}55, 0 2px 8px rgba(0,0,0,0.55)`,
          }}
        />
        <div
          data-handle="end"
          onPointerDown={beginRangeDrag("end")}
          className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-[3px] border-fg active:scale-110"
          style={{
            left: `${end * 100}%`,
            width: 22,
            height: 22,
            backgroundColor: endColor,
            boxShadow: `0 0 0 2px ${endColor}55, 0 2px 8px rgba(0,0,0,0.55)`,
          }}
        />
      </div>

      {selected && (
        <div className="flex items-center gap-2 rounded-xl border border-line bg-ink/40 px-2.5 py-2">
          <ColorSwatchButton
            value={selected.color}
            onChange={(hex) => updateColorStop(selected.id, { color: hex, alpha: 1 })}
            label="Stop color"
            className="size-8 rounded-lg"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-medium text-fg/90">Stop selected</div>
            <div className="font-mono text-[10px] tabular-nums text-muted">
              {stopAlpha(selected) < 0.08 ? "Transparent" : selected.color.toUpperCase()} ·{" "}
              {Math.round(selected.t * 100)}%
            </div>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-fg/10 px-2 py-1.5 text-[11px] text-fg/90 hover:bg-fg/16">
            <input
              type="checkbox"
              checked={stopAlpha(selected) < 0.08}
              onChange={(e) =>
                updateColorStop(selected.id, { alpha: e.target.checked ? 0 : 1 })
              }
              className="size-3.5 accent-current"
              aria-label="Make stop transparent"
            />
            Transparent
          </label>
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
        <div className="flex justify-between font-mono text-[10px] tabular-nums text-subtle">
          <span className="normal-case tracking-normal">
            {stops.length} stops
            {extraCount > 0 ? ` · +${extraCount} extra` : ""}
            {canAdd ? " · click ramp to add" : ""}
          </span>
          <span>
            {(start * 100).toFixed(0)}–{(end * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}
