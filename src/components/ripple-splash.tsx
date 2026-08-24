import { useCallback, useEffect, useRef, useState } from "react";

const MIN_MS = 900;
const FAILSAFE_MS = 2800;
const FADE_MS = 520;

export function useSurfaceSplash() {
  const [ready, setReady] = useState(false);
  const [gone, setGone] = useState(false);
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
    window.setTimeout(() => setReady(true), wait);
  }, []);

  useEffect(() => {
    started.current = performance.now();
    const failsafe = window.setTimeout(() => markReady(), FAILSAFE_MS);
    return () => window.clearTimeout(failsafe);
  }, [markReady]);

  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setGone(true), FADE_MS);
    return () => window.clearTimeout(t);
  }, [ready]);

  return { markReady, fading: ready, show: !gone };
}

export function RippleSplash({ fading = false }: { fading?: boolean }) {
  return (
    <div
      className={`ripple-splash fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-ink ${fading ? "is-fading" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Ripple is waking"
    >
      <div className="ripple-splash-rings" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h1 className="ripple-splash-title">Ripple</h1>
      <p className="ripple-splash-sub">the surface is waking</p>
    </div>
  );
}
