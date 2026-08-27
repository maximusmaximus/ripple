import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Minus } from "lucide-react";
import {
  defaultStopsFor,
  MAX_COLOR_STOPS,
  MIN_COLOR_STOPS,
  type ColorStop,
  stopAlpha,
  ensureShadowStop,
  isShadowStop,
  inkStops,
} from "@/lib/ripple/palettes";
import { useRippleStore } from "@/store/ripple";
import { TipMark, TipCopy } from "./tip-mark";
import { ColorSwatchButton } from "./color-wheel";
import { spanHalfH, spanSilhouettePath } from "./brush-span-slider";

function cssStops(stops: ColorStop[]) {
  const sorted = [...stops].sort((a, b) => a.t - b.t);
  return sorted.map((s) => {
    const a = stopAlpha(s);
    const hex = s.color;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const ok = Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b);
    const color = ok ? `rgba(${r},${g},${b},${a})` : hex;
    return { offset: `${Math.round(s.t * 1000) / 10}%`, color };
  });
}

export function ColorRangeSlider() {
  const worldId = useRippleStore((s) => s.worldId);
  const palette = useRippleStore((s) => s.getActivePalette());
  const storedPair = useRippleStore((s) => s.colorPairs[s.worldId]);
  const customStops = useRippleStore((s) => s.colorStops[s.worldId]);
  const shadowColor = useRippleStore((s) => s.shadowColor);
  const shadowOpacity = useRippleStore((s) => s.shadowOpacity);
  const resetColorRange = useRippleStore((s) => s.resetColorRange);
  const addColorStop = useRippleStore((s) => s.addColorStop);
  const removeColorStop = useRippleStore((s) => s.removeColorStop);
  const updateColorStop = useRippleStore((s) => s.updateColorStop);
  const gradientFlip = useRippleStore((s) => s.gradientFlip);
  const setGradientFlip = useRippleStore((s) => s.setGradientFlip);
  const spanStart = useRippleStore((s) => s.getActiveSpan().start);
  const spanMid = useRippleStore((s) => s.getActiveSpan().mid);
  const spanEnd = useRippleStore((s) => s.getActiveSpan().end);

  const stops = useMemo(() => {
    const base = customStops && customStops.length >= 2 ? customStops : defaultStopsFor(palette, storedPair);
    return ensureShadowStop(base, shadowColor, shadowOpacity);
  }, [customStops, palette, storedPair, shadowColor, shadowOpacity]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragStopId = useRef<string | null>(null);
  const uid = useId().replace(/:/g, "");

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
      if (!dragging.current || !dragStopId.current) return;
      updateColorStop(dragStopId.current, { t: clientXToT(e.clientX) });
    };
    const onUp = () => {
      dragging.current = false;
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
  }, [clientXToT, updateColorStop]);

  const beginStopDrag = (stop: ColorStop) => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(stop.id);
    dragging.current = true;
    dragStopId.current = stop.id;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onTrackPointerDown = (e: ReactPointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.dataset.stop || target.closest("[data-stop]")) return;
    e.preventDefault();
    const t = clientXToT(e.clientX);
    if (!canAdd) return;
    const id = addColorStop(t);
    if (!id) return;
    setSelectedId(id);
    dragging.current = true;
    dragStopId.current = id;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const hasCustomStops = Boolean(customStops && customStops.length >= 2);
  const isDefault = !hasCustomStops && !gradientFlip;
  const selected = selectedId ? stops.find((s) => s.id === selectedId) : null;
  const selectedShadow = Boolean(selected && isShadowStop(selected));
  const canAdd = stops.length < MAX_COLOR_STOPS;
  const canRemove = Boolean(selected) && !selectedShadow && inkStops(stops).length > MIN_COLOR_STOPS;
  const extraCount = Math.max(0, inkStops(stops).length - 6);
  const selectedA = selected ? stopAlpha(selected) : 1;
  const path = spanSilhouettePath(spanStart, spanMid, spanEnd);
  const gradStops = cssStops(stops);
  const checkerId = `chk-${uid}`;
  const gradId = `grad-${uid}`;

  const yFor = (t: number) => {
    const h =
      t < 0.5
        ? spanHalfH(spanStart) + (spanHalfH(spanMid) - spanHalfH(spanStart)) * t * 2
        : spanHalfH(spanMid) + (spanHalfH(spanEnd) - spanHalfH(spanMid)) * (t - 0.5) * 2;
    return ((40 + h) / 80) * 100;
  };

  return (
    <div className="flex flex-col gap-2 select-none" key={worldId}>
      <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wider text-muted">
        <span className="inline-flex items-center gap-1">
          Brush Color
          <TipMark id="gradient" />
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={gradientFlip}
            onClick={() => setGradientFlip(!gradientFlip)}
            className={
              "rounded-full border px-2 py-0.5 text-[10px] normal-case tracking-normal transition " +
              (gradientFlip ? "border-fg/70 bg-fg/20 text-fg" : "border-line text-subtle hover:text-fg")
            }
          >
            Flip
          </button>
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

      <div
        ref={trackRef}
        onPointerDown={onTrackPointerDown}
        className="relative h-24 w-full cursor-copy touch-none"
        title={canAdd ? "Click to add a color along the stroke" : "Maximum stops reached"}
      >
        <svg viewBox="0 0 200 80" className="absolute inset-0 size-full" preserveAspectRatio="none" aria-hidden>
          <defs>
            <pattern id={checkerId} width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill="#2a2a2a" />
              <rect width="4" height="4" fill="#4a4a4a" />
              <rect x="4" y="4" width="4" height="4" fill="#4a4a4a" />
            </pattern>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
              {gradStops.map((s, i) => (
                <stop key={i} offset={s.offset} stopColor={s.color} />
              ))}
            </linearGradient>
          </defs>
          <path d={path} fill={`url(#${checkerId})`} />
          <path d={path} fill={`url(#${gradId})`} />
        </svg>

        {stops.map((stop) => {
          const active = stop.id === selectedId;
          const a = stopAlpha(stop);
          const hole = a < 0.08;
          const shadow = isShadowStop(stop);
          const size = shadow ? 18 : 14;
          return (
            <button
              key={stop.id}
              type="button"
              data-stop={stop.id}
              title={shadow ? "Brush shadow" : hole ? "Transparent stop" : stop.color}
              onPointerDown={beginStopDrag(stop)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(stop.id);
              }}
              className={"absolute z-20 -translate-x-1/2 -translate-y-1/2 touch-none " + (active ? "scale-110" : "hover:scale-105")}
              style={{ left: `${stop.t * 100}%`, top: `${yFor(stop.t)}%` }}
              aria-label={shadow ? "Brush shadow stop" : hole ? "Transparent color stop" : `Color stop ${stop.color}`}
              aria-pressed={active}
            >
              <span
                className={
                  "block rotate-45 rounded-[3px] border-2 shadow " +
                  (active
                    ? "border-white shadow-[0_0_0_2px_rgba(0,0,0,0.45)]"
                    : shadow
                      ? "border-white shadow-black/50"
                      : "border-white/80 shadow-black/40")
                }
                style={{
                  width: size,
                  height: size,
                  background: hole
                    ? "repeating-conic-gradient(#d0d0d0 0% 25%, #555 0% 50%) 50% / 6px 6px"
                    : stop.color,
                  opacity: hole ? 1 : 0.35 + a * 0.65,
                }}
              />
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-subtle">
        <span>Start</span>
        <span>Belly</span>
        <span>Tail</span>
      </div>

      {selected && (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-ink/40 px-2.5 py-2">
          <div className="flex items-center gap-2">
            <ColorSwatchButton
              value={selected.color}
              onChange={(hex) => updateColorStop(selected.id, { color: hex })}
              label={selectedShadow ? "Brush shadow color" : "Stop color"}
              className="size-8 rounded-lg"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-medium text-fg/90">
                {selectedShadow ? "Brush shadow" : "Stop"}
              </div>
              <div className="font-mono text-[10px] tabular-nums text-muted">
                {selected.color.toUpperCase()} · {Math.round(selected.t * 100)}% along the stroke
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
              title={
                selectedShadow
                  ? "Brush shadow stays on the ramp"
                  : canRemove
                    ? "Remove stop"
                    : "Keep at least two stops"
              }
            >
              <Minus className="size-3.5" strokeWidth={2.25} />
              Remove
            </button>
          </div>
          <label className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] text-muted">
              <span>Opacity</span>
              <span className="font-mono tabular-nums text-fg">{Math.round(selectedA * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={selectedA}
              onChange={(e) => updateColorStop(selected.id, { alpha: parseFloat(e.target.value) })}
              className="w-full"
            />
          </label>
        </div>
      )}

      {!selected && (
        <div className="flex justify-between font-mono text-[10px] tabular-nums text-subtle">
          <span className="normal-case tracking-normal">
            {inkStops(stops).length} stops
            {extraCount > 0 ? ` · +${extraCount} extra` : ""}
            {" · shadow"}
          </span>
        </div>
      )}
      {!selected && canAdd && (
        <TipCopy>Left is the start of the stroke, right is the tail. Click to drop a color. The larger diamond is brush shadow.</TipCopy>
      )}
    </div>
  );
}
