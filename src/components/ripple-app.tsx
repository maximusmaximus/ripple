import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronUp } from "lucide-react";
import { useSearch } from "@tanstack/react-router";
import { WallViewport } from "./wall-viewport";
import { PadGate } from "./pad-gate";
import { ControlsDock } from "./controls-dock";
import { SensorsBar } from "./sensors-bar";
import { RippleCanvas } from "./ripple-canvas";
import { RippleSplash, useSurfaceSplash } from "./ripple-splash";
import type { SensorsState } from "@/lib/ripple/media";
import { emptySensorsState, createMicMonitor } from "@/lib/ripple/media";
import { releaseSensors } from "./sensors-gate";
import { useRippleStore } from "@/store/ripple";
import { useOrientation } from "@/hooks/use-orientation";
import type { Splat } from "@/lib/ripple/pointer";

export function RippleApp() {
  const search = useSearch({ from: "/" });
  const [sensors, setSensors] = useState<SensorsState>(() => ({ ...emptySensorsState }));
  const [hint, setHint] = useState(true);
  const [glError, setGlError] = useState<string | null>(null);
  const dockOpen = useRippleStore((s) => s.dockOpen);
  const setDockOpen = useRippleStore((s) => s.setDockOpen);
  const nextWorld = useRippleStore((s) => s.nextWorld);
  const prevWorld = useRippleStore((s) => s.prevWorld);
  const clearSurface = useRippleStore((s) => s.clearSurface);
  const worldId = useRippleStore((s) => s.worldId);
  const viscosity = useRippleStore((s) => s.viscosity);
  const waveStrength = useRippleStore((s) => s.waveStrength);
  const brushDiameter = useRippleStore((s) => s.brushDiameter);
  const { angle, isImmersive } = useOrientation();
  const splash = useSurfaceSplash();
  const dockPanelRef = useRef<HTMLDivElement>(null);
  const sensorsRef = useRef(sensors);
  sensorsRef.current = sensors;

  useEffect(() => {
    if (isImmersive) setDockOpen(false);
  }, [isImmersive, setDockOpen]);

  useEffect(() => {
    if (!dockOpen || isImmersive) return;
    const onPointerDown = (e: PointerEvent) => {
      const panel = dockPanelRef.current;
      if (!panel) return;
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (panel.contains(target)) return;
      setDockOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [dockOpen, isImmersive, setDockOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft" || e.key === "[") prevWorld();
      else if (e.key === "ArrowRight" || e.key === "]") nextWorld();
      else if (e.key === "Escape") setDockOpen(false);
      else if (e.key === "Backspace" && e.shiftKey) {
        e.preventDefault();
        clearSurface();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextWorld, prevWorld, setDockOpen, clearSurface]);

  useEffect(() => () => releaseSensors(sensorsRef.current), []);

  const onSensorsChange = useCallback((next: SensorsState) => setSensors(next), []);

  const onPaintStart = useCallback(() => {
    setDockOpen(false);
    setHint(false);
  }, [setDockOpen]);

  const mode = useMemo(() => {
    if (search.mode === "pad" && search.c) return "pad" as const;
    if (search.mode === "wall") return "wall" as const;
    return "local" as const;
  }, [search]);

  const showChrome = !isImmersive;

  if (mode === "pad" && search.c) {
    return (
      <PadGate code={search.c.toUpperCase()}>
        {(pad) => (
          <PadSurface
            sensors={sensors}
            onSensorsChange={onSensorsChange}
            angle={angle}
            showChrome={showChrome}
            onPaintStart={onPaintStart}
            sendSplats={pad.sendSplats}
            sendWorld={pad.sendWorld}
            sendFeel={pad.sendFeel}
            sendGyro={pad.sendGyro}
            sendMic={pad.sendMic}
            worldId={worldId}
            viscosity={viscosity}
            waveStrength={waveStrength}
            brushDiameter={brushDiameter}
          />
        )}
      </PadGate>
    );
  }

  if (mode === "wall") {
    return <WallViewport preferredCode={search.c} />;
  }

  return (
    <div
      className="relative h-dvh w-dvw overflow-hidden bg-ink"
      style={{ touchAction: "none", overscrollBehavior: "none" }}
    >
      <RippleCanvas
        sensors={sensors}
        orientationAngle={angle}
        onPaintStart={onPaintStart}
        webglError={setGlError}
        onReady={splash.markReady}
      />

      {glError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink p-6 text-center">
          <p className="max-w-sm text-sm text-muted">
            This surface needs WebGL2. Try another browser or enable hardware acceleration.
            <span className="mt-2 block font-mono text-xs text-subtle">{glError}</span>
          </p>
        </div>
      )}

      {hint && showChrome && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <p className="rounded-full border border-line bg-ink/50 px-4 py-2 text-sm text-fg/80 backdrop-blur-md">
            Drag to paint
          </p>
        </div>
      )}

      {showChrome && <SensorsBar sensors={sensors} onChange={onSensorsChange} />}

      {showChrome && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center p-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] transition-all duration-300 ease-out"
          style={{
            opacity: dockOpen ? 1 : 0,
            transform: dockOpen ? "translateY(0)" : "translateY(110%)",
          }}
          aria-hidden={!dockOpen}
        >
          <div
            ref={dockPanelRef}
            data-ui-chrome
            className="w-full max-w-sm"
            style={{ pointerEvents: dockOpen ? "auto" : "none" }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <ControlsDock />
          </div>
        </div>
      )}

      {!dockOpen && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            data-ui-chrome
            className="pointer-events-auto flex h-11 items-center gap-2 rounded-full border border-line bg-ink/55 px-4 text-sm text-fg/85 shadow-lg backdrop-blur-md transition hover:bg-ink/70 hover:text-fg"
            onClick={() => setDockOpen(true)}
            aria-label="Show menu"
          >
            <ChevronUp className="size-3.5" />
            Menu
          </button>
        </div>
      )}

      {splash.show && <RippleSplash fading={splash.fading} />}
    </div>
  );
}

function PadSurface({
  sensors,
  onSensorsChange,
  angle,
  showChrome,
  onPaintStart,
  sendSplats,
  sendWorld,
  sendFeel,
  sendGyro,
  sendMic,
  worldId,
  viscosity,
  waveStrength,
  brushDiameter,
}: {
  sensors: SensorsState;
  onSensorsChange: (s: SensorsState) => void;
  angle: 0 | 90 | 180 | 270;
  showChrome: boolean;
  onPaintStart: () => void;
  sendSplats: (s: Splat[]) => void;
  sendWorld: (id: string) => void;
  sendFeel: (viscosity: number, waveStrength: number, brushDiameter: number) => void;
  sendGyro: (alpha: number, beta: number, gamma: number, ang?: 0 | 90 | 180 | 270) => void;
  sendMic: (level: number, bands?: number[]) => void;
  worldId: string;
  viscosity: number;
  waveStrength: number;
  brushDiameter: number;
}) {
  const splash = useSurfaceSplash();

  useEffect(() => {
    sendWorld(worldId);
  }, [worldId, sendWorld]);

  useEffect(() => {
    sendFeel(viscosity, waveStrength, brushDiameter);
  }, [viscosity, waveStrength, brushDiameter, sendFeel]);

  useEffect(() => {
    if (!sensors.gyroOn && sensors.gyroMode === "off") return;
    const onOrient = (e: DeviceOrientationEvent) => {
      sendGyro(e.alpha ?? 0, e.beta ?? 0, e.gamma ?? 0, angle);
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, [sensors.gyroOn, sensors.gyroMode, sendGyro, angle]);

  useEffect(() => {
    if (!sensors.micOn || !sensors.micStream) return;
    let monitor: ReturnType<typeof createMicMonitor>;
    try {
      monitor = createMicMonitor(sensors.micStream);
    } catch {
      return;
    }
    let raf = 0;
    let last = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      if (now - last < 50) return;
      last = now;
      const frame = monitor.read();
      sendMic(frame.level, [frame.bass, frame.mid, frame.high]);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      monitor.stop();
    };
  }, [sensors.micOn, sensors.micStream, sendMic]);

  return (
    <div className="relative h-dvh w-dvw overflow-hidden bg-ink" style={{ touchAction: "none" }}>
      <RippleCanvas
        sensors={sensors}
        orientationAngle={angle}
        onPaintStart={onPaintStart}
        onSplats={sendSplats}
        onReady={splash.markReady}
      />
      {showChrome && <SensorsBar sensors={sensors} onChange={onSensorsChange} />}
      {splash.show && <RippleSplash fading={splash.fading} />}
    </div>
  );
}
