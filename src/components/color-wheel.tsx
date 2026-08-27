import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Hsv = { h: number; s: number; v: number };

function clamp(n: number, a = 0, b = 1) {
  return Math.max(a, Math.min(b, n));
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  return [parseInt(n.slice(0, 2), 16) || 0, parseInt(n.slice(2, 4), 16) || 0, parseInt(n.slice(4, 6), 16) || 0];
}

function rgbToHex(r: number, g: number, b: number) {
  const u = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0");
  return `#${u(r)}${u(g)}${u(b)}`;
}

function rgbToHsv(r: number, g: number, b: number): Hsv {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d > 1e-6) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max <= 1e-6 ? 0 : d / max, v: max };
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function hsvToHex(h: number, s: number, v: number) {
  return rgbToHex(...hsvToRgb(h, s, v));
}

const WHEEL = 148;

export function ColorWheel({
  value,
  onChange,
  onClose,
  anchor,
}: {
  value: string;
  onChange: (hex: string) => void;
  onClose: () => void;
  anchor: DOMRect;
}) {
  const hsv0 = rgbToHsv(...hexToRgb(value));
  const [hsv, setHsv] = useState<Hsv>(hsv0);
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHsv(rgbToHsv(...hexToRgb(value)));
  }, [value]);

  const commit = (next: Hsv) => {
    setHsv(next);
    onChange(hsvToHex(next.h, next.s, next.v));
  };

  const fromPointer = (clientX: number, clientY: number) => {
    const el = wheelRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const rad = r.width / 2;
    const dist = Math.hypot(dx, dy);
    const s = clamp(dist / rad);
    let h = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (h < 0) h += 360;
    const v = hsvRef.current.v < 0.22 ? 1 : hsvRef.current.v;
    commit({ h, s, v });
  };

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target;
      if (t instanceof Element && t.closest("[data-color-wheel]")) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - 196));
  const below = anchor.bottom + 8;
  const flip = below + 240 > window.innerHeight;
  const top = flip ? Math.max(8, anchor.top - 248) : below;
  const hex = hsvToHex(hsv.h, hsv.s, hsv.v);
  const markerX = 50 + Math.sin((hsv.h * Math.PI) / 180) * hsv.s * 46;
  const markerY = 50 - Math.cos((hsv.h * Math.PI) / 180) * hsv.s * 46;
  const full = hsvToHex(hsv.h, hsv.s, 1);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      data-color-wheel
      role="dialog"
      aria-label="Color wheel"
      className="fixed z-[130] w-[11.5rem] rounded-2xl border border-line bg-ink/95 p-2.5 shadow-2xl backdrop-blur-xl"
      style={{ left, top }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        ref={wheelRef}
        className="relative mx-auto cursor-crosshair touch-none rounded-full shadow-inner"
        style={{
          width: WHEEL,
          height: WHEEL,
          background: `radial-gradient(circle at center, #fff 0%, transparent 70%), conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)`,
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          fromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons) fromPointer(e.clientX, e.clientY);
        }}
      >
        <span
          className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.55)]"
          style={{ left: `${markerX}%`, top: `${markerY}%`, background: hex }}
        />
      </div>
      <label className="mt-2 flex flex-col gap-1">
        <span className="text-[9px] uppercase tracking-wider text-subtle">Brightness</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={hsv.v}
          onChange={(e) => commit({ ...hsv, v: parseFloat(e.target.value) })}
          className="w-full"
          style={{
            background: `linear-gradient(to right, #000, ${full})`,
          }}
          aria-label="Brightness"
        />
      </label>
      <div className="mt-2 flex items-center gap-2">
        <span className="size-6 shrink-0 rounded-md border border-line" style={{ background: hex }} />
        <input
          value={hex.toUpperCase()}
          maxLength={7}
          spellCheck={false}
          className="min-w-0 flex-1 rounded-md border border-line bg-ink/60 px-1.5 py-1 font-mono text-[11px] text-fg outline-none"
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (!/^#?[0-9a-fA-F]{6}$/.test(raw)) return;
            const next = raw.startsWith("#") ? raw : `#${raw}`;
            onChange(next.toLowerCase());
          }}
          aria-label="Hex color"
        />
      </div>
    </div>,
    document.body,
  );
}

export function ColorSwatchButton({
  value,
  onChange,
  label,
  className = "size-8 rounded-full",
}: {
  value: string;
  onChange: (hex: string) => void;
  label: string;
  className?: string;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  const toggle = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (open) {
      setOpen(false);
      return;
    }
    if (r) {
      setAnchor(r);
      setOpen(true);
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={label}
        aria-label={label}
        aria-expanded={open}
        onClick={toggle}
        className={"relative shrink-0 border-2 border-fg/85 shadow-md " + className}
        style={{ backgroundColor: value }}
      />
      {open && anchor && (
        <ColorWheel
          value={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
          anchor={anchor}
        />
      )}
    </>
  );
}
