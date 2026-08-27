import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { DIA_MAX, DIA_MIN, type BrushSpan } from "@/lib/ripple/brushes";
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

function halfH(v: number) {
  return 6 + toT(v) * 26;
}

export function SpanProfile({
  title,
  tipId,
  start,
  mid,
  end,
  onChange,
  fillClass = "text-fg/45",
}: {
  title: string;
  tipId: string;
  start: number;
  mid: number;
  end: number;
  onChange: (span: BrushSpan) => void;
  fillClass?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"start" | "mid" | "end" | null>(null);
  const spanRef = useRef({ start, mid, end });
  spanRef.current = { start, mid, end };

  const clientToVal = useCallback((clientY: number) => {
    const el = trackRef.current;
    if (!el) return DIA_MIN;
    const rect = el.getBoundingClientRect();
    const t = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / Math.max(1, rect.height)));
    return fromT(t);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const which = dragging.current;
      if (!which) return;
      const v = clientToVal(e.clientY);
      const cur = spanRef.current;
      onChange({ ...cur, [which]: v });
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
  }, [clientToVal, onChange]);

  const begin = (which: "start" | "mid" | "end") => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = which;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const sH = halfH(start);
  const mH = halfH(mid);
  const eH = halfH(end);
  const d = `M 8 ${40 - sH} L 100 ${40 - mH} L 192 ${40 - eH} L 192 ${40 + eH} L 100 ${40 + mH} L 8 ${40 + sH} Z`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          {title}
          <TipMark id={tipId} />
        </span>
        <span className="font-mono tabular-nums text-fg">
          {label(start)} · {label(mid)} · {label(end)}
        </span>
      </div>
      <div
        ref={trackRef}
        className="relative h-24 w-full cursor-ns-resize touch-none rounded-xl border border-line/80 bg-fg/5"
        onPointerDown={(e) => {
          const el = trackRef.current;
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const x = (e.clientX - rect.left) / Math.max(1, rect.width);
          const which = x < 0.33 ? "start" : x < 0.66 ? "mid" : "end";
          dragging.current = which;
          onChange({ ...spanRef.current, [which]: clientToVal(e.clientY) });
        }}
      >
        <svg viewBox="0 0 200 80" className={"absolute inset-0 size-full " + fillClass} preserveAspectRatio="none" aria-hidden>
          <path d={d} fill="currentColor" />
        </svg>
        {(
          [
            ["start", 8, start, sH, `${title} start`],
            ["mid", 100, mid, mH, `${title} belly`],
            ["end", 192, end, eH, `${title} tail`],
          ] as const
        ).map(([key, x, val, h, aria]) => (
          <button
            key={key}
            type="button"
            aria-label={aria}
            title={`${aria} ${label(val)}`}
            onPointerDown={begin(key)}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-fg bg-ink shadow-md"
            style={{
              left: `${(x / 200) * 100}%`,
              top: `${((40 - h) / 80) * 100}%`,
              width: key === "mid" ? 22 : 18,
              height: key === "mid" ? 22 : 18,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-subtle">
        <span>Start</span>
        <span>Belly</span>
        <span>Tail</span>
      </div>
    </div>
  );
}

export function BrushSpanSlider() {
  const brushId = useRippleStore((s) => s.brushId);
  const start = useRippleStore((s) => s.getActiveSpan().start);
  const mid = useRippleStore((s) => s.getActiveSpan().mid);
  const end = useRippleStore((s) => s.getActiveSpan().end);
  const setBrushSpan = useRippleStore((s) => s.setBrushSpan);

  return (
    <div key={brushId}>
      <SpanProfile title="Width" tipId="diameter" start={start} mid={mid} end={end} onChange={setBrushSpan} />
    </div>
  );
}
