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
import { type BrushSpan } from "@/lib/ripple/brushes";
import { useRippleStore } from "@/store/ripple";
import { TipMark, TipCopy } from "./tip-mark";
import { ColorSwatchButton } from "./color-wheel";
import { spanSilhouettePath, fromDiaT, clientYToDia } from "./brush-span-slider";

function cssStops(stops: ColorStop[]) {
  const sorted = [...stops].sort((a, b) => a.t - b.t);
  return sorted.map((s) => {
    const a = stopAlpha(s);
    const hex = s.color.startsWith("#") ? s.color.slice(1) : s.color;
    const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
    const n = parseInt(full, 16);
    const ok = Number.isFinite(n) && full.length >= 6;
    const r = ok ? (n >> 16) & 255 : 255;
    const g = ok ? (n >> 8) & 255 : 255;
    const b = ok ? n & 255 : 255;
    const color = `rgba(${r},${g},${b},${a})`;
    return { offset: `${Math.round(s.t * 1000) / 10}%`, color };
  });
}

function diaLabel(n: number) {
  return Math.round(n * 200);
}

type WidthKey = "start" | "mid" | "end";

/**
 * One stroke graphic: width circles on top, color diamonds on the bottom.
 */
export function ColorRangeSlider() {
  const worldId = useRippleStore((s) => s.worldId);
  const brushId = useRippleStore((s) => s.brushId);
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
  const setBrushSpan = useRippleStore((s) => s.setBrushSpan);

  const stops = useMemo(() => {
    const base = customStops && customStops.length >= 2 ? customStops : defaultStopsFor(palette, storedPair);
    return ensureShadowStop(base, shadowColor, shadowOpacity);
  }, [customStops, palette, storedPair, shadowColor, shadowOpacity]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const colorDragging = useRef(false);
  const dragStopId = useRef<string | null>(null);
  const widthDragging = useRef<WidthKey | null>(null);
  const spanRef = useRef({ start: spanStart, mid: spanMid, end: spanEnd });
  spanRef.current = { start: spanStart, mid: spanMid, end: spanEnd };
  const uid = useId().replace(/:/g, "");

  const stopIds = useMemo(() => stops.map((s) => s.id).join("|"), [stops]);

  useEffect(() => {
    setSelectedId(null);
  }, [worldId, brushId]);

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

  const widthFromY = useCallback((clientY: number) => {
    const el = trackRef.current;
    if (!el) return fromDiaT(0);
    return clientYToDia(el, clientY);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (widthDragging.current) {
        const v = widthFromY(e.clientY);
        const cur = spanRef.current;
        setBrushSpan({ ...cur, [widthDragging.current]: v } as BrushSpan);
        return;
      }
      if (!colorDragging.current || !dragStopId.current) return;
      updateColorStop(dragStopId.current, { t: clientXToT(e.clientX) });
    };
    const onUp = () => {
      colorDragging.current = false;
      dragStopId.current = null;
      widthDragging.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [clientXToT, updateColorStop, widthFromY, setBrushSpan]);

  const beginStopDrag = (stop: ColorStop) => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(stop.id);
    colorDragging.current = true;
    dragStopId.current = stop.id;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const beginWidthDrag = (which: WidthKey) => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    widthDragging.current = which;
    setBrushSpan({ ...spanRef.current, [which]: widthFromY(e.clientY) });
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onTrackPointerDown = (e: ReactPointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.dataset.stop || target.closest("[data-stop]") || target.closest("[data-width-stop]")) return;
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y = (e.clientY - rect.top) / Math.max(1, rect.height);
    if (y < 0.28) {
      e.preventDefault();
      const x = (e.clientX - rect.left) / Math.max(1, rect.width);
      const which: WidthKey = x < 0.33 ? "start" : x < 0.66 ? "mid" : "end";
      widthDragging.current = which;
      setBrushSpan({ ...spanRef.current, [which]: widthFromY(e.clientY) });
      return;
    }
    e.preventDefault();
    const t = clientXToT(e.clientX);
    if (!canAdd) return;
    const id = addColorStop(t);
    if (!id) return;
    setSelectedId(id);
    colorDragging.current = true;
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

  const widthStops: { key: WidthKey; x: number; val: number; label: string }[] = [
    { key: "start", x: 8, val: spanStart, label: "Width start" },
    { key: "mid", x: 100, val: spanMid, label: "Width belly" },
    { key: "end", x: 192, val: spanEnd, label: "Width tail" },
  ];

  return (
    <div className="flex flex-col gap-2 select-none" key={`${worldId}-${brushId}`} data-stroke-editor="true">
      <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wider text-muted">
        <span className="inline-flex items-center gap-1">
          Width · Color
          <TipMark id="diameter" />
          <TipMark id="gradient" />
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] tabular-nums normal-case tracking-normal text-fg">
            {diaLabel(spanStart)} · {diaLabel(spanMid)} · {diaLabel(spanEnd)}
          </span>
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
        className="relative h-32 w-full cursor-copy touch-none rounded-xl border border-line/80 bg-fg/5"
        title={canAdd ? "Circles set width. Diamonds set color. Click the body to drop a color." : "Maximum color stops reached"}
      >
        <svg
          viewBox="0 0 200 80"
          className="pointer-events-none absolute inset-x-1 top-6 bottom-8 w-[calc(100%-0.5rem)]"
          preserveAspectRatio="none"
          aria-hidden
        >
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

        {widthStops.map((w) => (
          <button
            key={w.key}
            type="button"
            data-width-stop={w.key}
            aria-label={w.label}
            title={`${w.label} ${diaLabel(w.val)}`}
            onPointerDown={beginWidthDrag(w.key)}
            className="absolute z-20 flex size-11 -translate-x-1/2 items-start justify-center touch-none"
            style={{ left: `${(w.x / 200) * 100}%`, top: "0.15rem" }}
          >
            <span
              className="rounded-full border-[3px] border-fg bg-ink shadow-md"
              style={{ width: w.key === "mid" ? 22 : 18, height: w.key === "mid" ? 22 : 18 }}
            />
          </button>
        ))}

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
              className={
                "absolute z-20 flex size-11 -translate-x-1/2 items-end justify-center touch-none " +
                (active ? "scale-110" : "hover:scale-105")
              }
              style={{ left: `${stop.t * 100}%`, bottom: "0.1rem" }}
              aria-label={shadow ? "Brush shadow stop" : hole ? "Transparent color stop" : `Color stop ${stop.color}`}
              aria-pressed={active}
            >
              <span
                className={
                  "mb-0.5 block rotate-45 rounded-[3px] border-2 shadow " +
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
            Circles · width · diamonds · color
            {extraCount > 0 ? ` · +${extraCount} extra` : ""}
            {" · shadow"}
          </span>
        </div>
      )}
      {!selected && canAdd && (
        <TipCopy>
          Circles on top set start, belly, and tail width. Diamonds along the bottom are colors — click the body to drop one. The larger diamond is brush shadow.
        </TipCopy>
      )}
    </div>
  );
}
