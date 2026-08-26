import { useCallback, useEffect, useRef, useState } from "react";

const MIN_MS = 0;
const FAILSAFE_MS = 800;
const FADE_MS = 280;
const WHEEL_R = 42;
const WHEEL_C = 2 * Math.PI * WHEEL_R;

const DEFAULT_COLORS = ["#03080e", "#07141f", "#1a4a5c", "#7ec8d8", "#d7f6ff"];

export function useSurfaceSplash() {
  const [ready, setReady] = useState(false);
  const [gone, setGone] = useState(false);
  const [progress, setProgress] = useState(0.06);
  const started = useRef(0);
  const armed = useRef(false);
  if (started.current === 0 && typeof performance !== "undefined") {
    started.current = performance.now();
  }

  const markReady = useCallback(() => {
    if (armed.current) return;
    armed.current = true;
    const elapsed = performance.now() - started.current;
    const wait = Math.max(0, MIN_MS - elapsed);
    window.setTimeout(() => {
      setProgress(1);
      setReady(true);
    }, wait);
  }, []);

  useEffect(() => {
    started.current = performance.now();
    const failsafe = window.setTimeout(() => markReady(), FAILSAFE_MS);
    let raf = 0;
    const tick = () => {
      if (armed.current) return;
      const t = (performance.now() - started.current) / FAILSAFE_MS;
      setProgress(0.06 + 0.79 * (1 - Math.exp(-2.4 * Math.max(0, t))));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      window.clearTimeout(failsafe);
      cancelAnimationFrame(raf);
    };
  }, [markReady]);

  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setGone(true), FADE_MS);
    return () => window.clearTimeout(t);
  }, [ready]);

  return { markReady, fading: ready, show: !gone, progress };
}

export function RippleSplash({
  fading = false,
  progress = 0.18,
  colors = DEFAULT_COLORS,
}: {
  fading?: boolean;
  progress?: number;
  colors?: string[];
}) {
  const c0 = colors[0] ?? DEFAULT_COLORS[0]!;
  const c1 = colors[2] ?? colors[1] ?? DEFAULT_COLORS[2]!;
  const c2 = colors[4] ?? colors[colors.length - 1] ?? DEFAULT_COLORS[4]!;
  const c3 = colors[3] ?? colors[1] ?? DEFAULT_COLORS[3]!;
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  const offset = WHEEL_C * (1 - Math.max(0, Math.min(1, progress)));

  return (
    <div
      className={`ripple-splash ${fading ? "is-fading" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={`Ripple is waking, ${pct} percent`}
    >
      <div
        className="ripple-splash-wash"
        aria-hidden="true"
        style={{
          ["--wash-a" as string]: c0,
          ["--wash-b" as string]: c1,
          ["--wash-c" as string]: c2,
          ["--wash-d" as string]: c3,
        }}
      />
      <div className="ripple-splash-wheel" aria-hidden="true">
        <svg viewBox="0 0 100 100">
          <circle className="ripple-splash-track" cx="50" cy="50" r={WHEEL_R} />
          <circle
            className="ripple-splash-fill"
            cx="50"
            cy="50"
            r={WHEEL_R}
            strokeDasharray={WHEEL_C}
            strokeDashoffset={offset}
          />
        </svg>
      </div>
      <h1 className="ripple-splash-title">Ripple</h1>
      <p className="ripple-splash-sub">paint while it wakes · {pct}%</p>
    </div>
  );
}
