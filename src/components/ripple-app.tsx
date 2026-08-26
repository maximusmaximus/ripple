import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronUp } from "lucide-react";
import { useSearch } from "@tanstack/react-router";
import { WallViewport } from "./wall-viewport";
import { PadGate } from "./pad-gate";
import { ControlsDock } from "./controls-dock";
import { SensorsBar } from "./sensors-bar";
import { RippleCanvas } from "./ripple-canvas";
import { RippleSplash, useSurfaceSplash } from "./ripple-splash";
import { PairOverlay } from "./pair-overlay";
import type { SensorsState } from "@/lib/ripple/media";
import { emptySensorsState, createMicMonitor } from "@/lib/ripple/media";
import { releaseSensors } from "./sensors-gate";
import { useRippleStore } from "@/store/ripple";
import { useOrientation } from "@/hooks/use-orientation";
import { useDesktopHost } from "@/hooks/use-desktop";
import { useCastHost, type RemoteFrame, type RemoteInput } from "@/hooks/use-cast-host";
import { StudioSync } from "./studio-sync";
import { TipsGuide } from "./tips-guide";
import { useCanvasRecord } from "@/hooks/use-canvas-record";
import type { Splat } from "@/lib/ripple/pointer";
import { PALETTES, type PaletteId } from "@/lib/ripple/palettes";
import { compactCastSnapshot, hydrateSnapshotMedia, type StudioSnapshot } from "@/lib/ripple/studio";
import { formatCountdown, sendRecBlob } from "@/lib/ripple/record";

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
  const setViscosity = useRippleStore((s) => s.setViscosity);
  const setWaveStrength = useRippleStore((s) => s.setWaveStrength);
  const setBrushDiameter = useRippleStore((s) => s.setBrushDiameter);
  const setWorld = useRippleStore((s) => s.setWorld);
  const applySnapshot = useRippleStore((s) => s.applySnapshot);
  const { angle, isImmersive } = useOrientation();
  const splash = useSurfaceSplash();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostSendRef = useRef<(msg: import("@/lib/ripple/cast").CastMsg) => void>(() => {});
  const hostLiveRef = useRef(false);
  const record = useCanvasRecord(() => canvasRef.current, {
    onBlob: async (blob, name) => {
      if (hostLiveRef.current) await sendRecBlob((m) => hostSendRef.current(m), blob, name);
    },
  });
  const recRef = useRef(record);
  recRef.current = record;
  const dockPanelRef = useRef<HTMLDivElement>(null);
  const sensorsRef = useRef(sensors);
  sensorsRef.current = sensors;
  const isDesktop = useDesktopHost();
  const [pairDismissed, setPairDismissed] = useState(false);
  const [pairForced, setPairForced] = useState(false);
  const [injectSplats, setInjectSplats] = useState<Splat[] | null>(null);
  const [injectKey, setInjectKey] = useState(0);
  const [remoteMic, setRemoteMic] = useState(0);
  const [remoteMicBands, setRemoteMicBands] = useState<number[] | null>(null);
  const [remoteGyro, setRemoteGyro] = useState<{
    beta: number;
    gamma: number;
    angle?: 0 | 90 | 180 | 270;
  } | null>(null);
  const [camSource, setCamSource] = useState<HTMLCanvasElement | null>(null);
  const camCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastBmp = useRef<ImageBitmap | null>(null);

  const mode = useMemo(() => {
    if (search.mode === "pad" && search.c) return "pad" as const;
    if (search.mode === "wall") return "wall" as const;
    return "local" as const;
  }, [search]);

  const onCamFrame = useCallback(async (frame: RemoteFrame) => {
    try {
      if (!camCanvasRef.current) camCanvasRef.current = document.createElement("canvas");
      const canvas = camCanvasRef.current;
      const blob = new Blob([frame.jpeg], { type: "image/jpeg" });
      const bmp = await createImageBitmap(blob);
      if (canvas.width !== bmp.width || canvas.height !== bmp.height) {
        canvas.width = bmp.width;
        canvas.height = bmp.height;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(bmp, 0, 0);
      lastBmp.current?.close();
      lastBmp.current = bmp;
      setCamSource(canvas);
    } catch {
      /* drop frame */
    }
  }, []);

  const onRemoteInput = useCallback(
    (input: RemoteInput) => {
      if (input.splats?.length) {
        setInjectSplats(input.splats);
        setInjectKey((n) => n + 1);
      }
      if (input.ptr?.down) {
        setInjectSplats([{ x: input.ptr.x, y: input.ptr.y, force: 0.55, radius: 0.03 }]);
        setInjectKey((n) => n + 1);
      }
      if (input.worldId && input.worldId in PALETTES) setWorld(input.worldId as PaletteId);
      if (input.feel) {
        setViscosity(input.feel.viscosity);
        setWaveStrength(input.feel.waveStrength);
        setBrushDiameter(input.feel.brushDiameter);
      }
      if (input.snapshot) {
        void hydrateSnapshotMedia(input.snapshot).then((snap) => applySnapshot(snap));
      }
      if (input.clear) clearSurface();
      if (input.mic) {
        setRemoteMic(input.mic.level);
        setRemoteMicBands(input.mic.bands ?? null);
      }
      if (input.gyro) {
        setRemoteGyro({
          beta: input.gyro.beta,
          gamma: input.gyro.gamma,
          angle: input.gyro.angle,
        });
      }
    },
    [setWorld, setViscosity, setWaveStrength, setBrushDiameter, applySnapshot, clearSurface],
  );

  const host = useCastHost({
    stayOnPage: true,
    enabled: isDesktop && mode === "local",
    onCamFrame,
    onRemoteInput,
    onRecToggle: (on) => {
      if (on) recRef.current.start();
      else recRef.current.stop();
    },
  });
  hostSendRef.current = host.send;
  hostLiveRef.current = host.isLive;

  const openPair = useCallback(() => {
    setPairForced(true);
    setPairDismissed(false);
    setDockOpen(false);
  }, [setDockOpen]);

  useEffect(() => {
    void useRippleStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (host.state === "reconnecting") {
      setPairDismissed(false);
      setPairForced(true);
      setCamSource(null);
      setRemoteGyro(null);
      setRemoteMic(0);
      setRemoteMicBands(null);
    }
    if (host.isLive) {
      setPairForced(false);
      setPairDismissed(true);
      setDockOpen(false);
    }
  }, [host.state, host.isLive, setDockOpen]);

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
      if (target instanceof Element && target.closest("[data-emoji-suggest],[data-color-wheel]")) return;
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

  const showChrome = !isImmersive && !host.isLive;
  const showPairOverlay = !host.isLive && (pairForced || !pairDismissed);
  const linkState: "off" | "waiting" | "live" = host.isLive
    ? "live"
    : host.state === "waiting" || host.state === "reconnecting"
      ? "waiting"
      : "off";

  useEffect(() => {
    if (!host.isLive) return;
    if (record.state === "recording" && record.startedAt) {
      host.send({ t: "rec-state", on: true, startedAt: record.startedAt, limitMs: record.limitMs });
    } else if (record.state === "idle") {
      host.send({ t: "rec-state", on: false, startedAt: 0, limitMs: record.limitMs });
    }
  }, [host.isLive, host.send, record.state, record.startedAt, record.limitMs]);

  if (mode === "pad" && search.c) {
    return (
      <PadGate code={search.c.toUpperCase()}>
        {(pad) => (
          <PadSurface
            sensors={sensors}
            onSensorsChange={onSensorsChange}
            angle={angle}
            onPaintStart={onPaintStart}
            sendSplats={pad.sendSplats}
            sendWorld={pad.sendWorld}
            sendFeel={pad.sendFeel}
            sendGyro={pad.sendGyro}
            sendMic={pad.sendMic}
            sendStudio={pad.sendStudio}
            sendClear={pad.sendClear}
            sendRec={pad.sendRec}
            recOn={pad.recOn}
            recStartedAt={pad.recStartedAt}
            recLimitMs={pad.recLimitMs}
            recRemainingMs={pad.recRemainingMs}
            recSaving={pad.recSaving}
            pendingClip={pad.pendingClip}
            recNote={pad.recNote}
            clearPendingClip={pad.clearPendingClip}
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
      data-cast-state={host.state}
      data-cast-live={host.isLive ? "true" : "false"}
    >
      <StudioSync />
      <RippleCanvas
        ref={canvasRef}
        sensors={sensors}
        orientationAngle={angle}
        onPaintStart={onPaintStart}
        webglError={setGlError}
        onReady={splash.markReady}
        injectSplats={injectSplats}
        injectKey={injectKey}
        cameraSource={camSource}
        remoteMicLevel={remoteMic}
        remoteMicBands={remoteMicBands}
        remoteGyro={remoteGyro}
      />

      {glError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink p-6 text-center">
          <p className="max-w-sm text-sm text-muted">
            This surface needs WebGL2. Try another browser or enable hardware acceleration.
            <span className="mt-2 block font-mono text-xs text-subtle">{glError}</span>
          </p>
        </div>
      )}

      {hint && showChrome && !(showPairOverlay && isDesktop) && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <p className="rounded-full border border-line bg-ink/50 px-4 py-2 text-sm text-fg/80 backdrop-blur-md">
            Drag to paint
          </p>
        </div>
      )}

      {record.state === "recording" && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-center pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="rec-live flex items-center gap-2 rounded-full border border-red-400/80 bg-red-700/90 px-3 py-1 text-[11px] font-medium tracking-wide text-white shadow-lg">
            <span className="inline-block size-2 rounded-full bg-white" />
            {formatCountdown(record.remainingMs)} left · both screens save
          </div>
        </div>
      )}

      {showChrome && (
        <SensorsBar
          sensors={sensors}
          onChange={onSensorsChange}
          recording={record.state === "recording"}
          onToggleRecord={record.toggle}
          recordStartedAt={record.startedAt}
          recordLimitMs={record.limitMs}
          recordRemainingMs={record.remainingMs}
          recordSaving={record.state === "saving"}
          pendingClip={record.pendingClip}
          onSaveClip={record.clearPending}
          recordError={record.error}
          linkState={linkState}
          onToggleLink={openPair}
        />
      )}

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
            <ControlsDock onShowPair={openPair} showPairButton />
          </div>
        </div>
      )}

      {showChrome && !dockOpen && (
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

      {showChrome && <TipsGuide />}

      {showPairOverlay && (
        <PairOverlay
          host={host}
          onDismiss={() => {
            setPairDismissed(true);
            setPairForced(false);
          }}
        />
      )}

      {splash.show && !(showPairOverlay && isDesktop) && (
        <RippleSplash
          fading={splash.fading}
          progress={splash.progress}
          colors={PALETTES[worldId]?.colors}
        />
      )}
    </div>
  );
}

function PadSurface({
  sensors,
  onSensorsChange,
  angle,
  onPaintStart,
  sendSplats,
  sendWorld,
  sendFeel,
  sendGyro,
  sendMic,
  sendStudio,
  sendClear,
  sendRec,
  recOn,
  recStartedAt,
  recLimitMs,
  recRemainingMs,
  recSaving,
  pendingClip,
  recNote,
  clearPendingClip,
  worldId,
  viscosity,
  waveStrength,
  brushDiameter,
}: {
  sensors: SensorsState;
  onSensorsChange: (s: SensorsState) => void;
  angle: 0 | 90 | 180 | 270;
  onPaintStart: () => void;
  sendSplats: (s: Splat[]) => void;
  sendWorld: (id: string) => void;
  sendFeel: (viscosity: number, waveStrength: number, brushDiameter: number) => void;
  sendGyro: (alpha: number, beta: number, gamma: number, ang?: 0 | 90 | 180 | 270) => void;
  sendMic: (level: number, bands?: number[]) => void;
  sendStudio: (snap: StudioSnapshot) => void;
  sendClear: () => void;
  sendRec: (on: boolean) => void;
  recOn: boolean;
  recStartedAt: number | null;
  recLimitMs: number;
  recRemainingMs: number;
  recSaving: boolean;
  pendingClip: import("@/lib/ripple/record").PendingClip | null;
  recNote: string | null;
  clearPendingClip: () => void;
  worldId: string;
  viscosity: number;
  waveStrength: number;
  brushDiameter: number;
}) {
  const splash = useSurfaceSplash();
  const dockOpen = useRippleStore((s) => s.dockOpen);
  const setDockOpen = useRippleStore((s) => s.setDockOpen);
  const takeSnapshot = useRippleStore((s) => s.takeSnapshot);
  const clearToken = useRippleStore((s) => s.clearToken);
  const dockPanelRef = useRef<HTMLDivElement>(null);
  const lastStudio = useRef("");
  const lastClear = useRef(clearToken);

  useEffect(() => {
    setDockOpen(true);
  }, [setDockOpen]);

  useEffect(() => {
    sendWorld(worldId);
  }, [worldId, sendWorld]);

  useEffect(() => {
    sendFeel(viscosity, waveStrength, brushDiameter);
  }, [viscosity, waveStrength, brushDiameter, sendFeel]);

  useEffect(() => {
    let timer = 0;
    const flush = () => {
      const snap = compactCastSnapshot(takeSnapshot());
      const wire = JSON.stringify(snap);
      if (wire === lastStudio.current) return;
      lastStudio.current = wire;
      sendStudio(snap);
    };
    flush();
    const unsub = useRippleStore.subscribe(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(flush, 40);
    });
    return () => {
      window.clearTimeout(timer);
      unsub();
    };
  }, [sendStudio, takeSnapshot]);

  useEffect(() => {
    if (clearToken === lastClear.current) return;
    lastClear.current = clearToken;
    sendClear();
  }, [clearToken, sendClear]);

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

  useEffect(() => {
    if (!dockOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const panel = dockPanelRef.current;
      if (!panel) return;
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (panel.contains(target)) return;
      if (target instanceof Element && target.closest("[data-emoji-suggest],[data-color-wheel]")) return;
      setDockOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [dockOpen, setDockOpen]);

  return (
    <div className="relative h-dvh w-dvw overflow-hidden bg-ink" style={{ touchAction: "none" }} data-pad="true">
      <StudioSync />
      <RippleCanvas
        sensors={sensors}
        orientationAngle={angle}
        onPaintStart={onPaintStart}
        onSplats={sendSplats}
        onReady={splash.markReady}
      />
      <SensorsBar
        sensors={sensors}
        onChange={onSensorsChange}
        recording={recOn}
        onToggleRecord={() => sendRec(!recOn)}
        recordStartedAt={recStartedAt}
        recordLimitMs={recLimitMs}
        recordRemainingMs={recRemainingMs}
        recordSaving={recSaving}
        pendingClip={pendingClip}
        onSaveClip={clearPendingClip}
        recNote={recNote}
      />

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
          <ControlsDock showPairButton={false} />
        </div>
      </div>

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

      <TipsGuide />

      {splash.show && (
        <RippleSplash
          fading={splash.fading}
          progress={splash.progress}
          colors={PALETTES[worldId as PaletteId]?.colors}
        />
      )}
    </div>
  );
}
