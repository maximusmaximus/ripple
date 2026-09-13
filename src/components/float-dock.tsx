import { useCallback, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { GripHorizontal, Minus } from "lucide-react";
import {
  clampFloatPos,
  defaultFloatPos,
  floatPanelSize,
  loadFloatDockPos,
  saveFloatDockPos,
  type DockPoint,
} from "@/lib/ripple/float-dock";

export function useFloatDockAnchor() {
  const [pos, setPos] = useState<DockPoint>(() => ({ x: 16, y: 76 }));

  useLayoutEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const size = floatPanelSize(vw, vh);
    const stored = loadFloatDockPos();
    setPos(clampFloatPos(stored ?? defaultFloatPos(vw, vh), { vw, vh, ...size }));

    const onResize = () => {
      const nextVw = window.innerWidth;
      const nextVh = window.innerHeight;
      const nextSize = floatPanelSize(nextVw, nextVh);
      setPos((p) => clampFloatPos(p, { vw: nextVw, vh: nextVh, ...nextSize }));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const moveTo = useCallback((next: DockPoint, box?: { width: number; height: number }) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const size = box ?? floatPanelSize(vw, vh);
    const clamped = clampFloatPos(next, { vw, vh, ...size });
    setPos(clamped);
    saveFloatDockPos(clamped);
  }, []);

  return { pos, moveTo };
}

export function FloatDock({
  pos,
  onPos,
  onMinimize,
  children,
}: {
  pos: DockPoint;
  onPos: (next: DockPoint, box?: { width: number; height: number }) => void;
  onMinimize: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const boxRef = useRef({ width: 352, height: 480 });

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      boxRef.current = { width: rect.width, height: rect.height };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (e.target instanceof Element && e.target.closest("[data-float-min]")) return;
    drag.current = { x: pos.x, y: pos.y, px: e.clientX, py: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const nx = drag.current.x + (e.clientX - drag.current.px);
    const ny = drag.current.y + (e.clientY - drag.current.py);
    onPos({ x: nx, y: ny }, boxRef.current);
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      ref={panelRef}
      data-ui-chrome
      data-float-dock="true"
      className="float-dock"
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div
        data-float-handle="true"
        className="float-dock-handle"
        aria-label="Drag to move menu"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span className="float-dock-grip" aria-hidden>
          <GripHorizontal className="size-5" strokeWidth={1.75} />
        </span>
        <button
          type="button"
          data-float-min="true"
          className="float-dock-min"
          aria-label="Minimize menu"
          title="Minimize"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMinimize();
          }}
        >
          <Minus className="size-5" strokeWidth={2} />
        </button>
      </div>
      <div className="float-dock-body">{children}</div>
    </div>
  );
}
