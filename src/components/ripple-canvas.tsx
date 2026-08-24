import { useEffect, useRef } from "react";
import { RippleEngine } from "@/lib/ripple/engine";
import { PointerPainter, bindPainter, type Splat } from "@/lib/ripple/pointer";
import { createStrokeTracker } from "@/lib/ripple/gestures";
import { useRippleStore } from "@/store/ripple";
import { PALETTES } from "@/lib/ripple/palettes";
import { getBrush } from "@/lib/ripple/brushes";
import { asFxList, fxMask } from "@/lib/ripple/blend";
import type { SensorsState } from "@/lib/ripple/media";
import {
  createMicMonitor,
  tickMicEnvelope,
  micFromRemote,
  SILENT_MIC,
  type MicFrame,
} from "@/lib/ripple/media";
import type { ScreenAngle } from "@/lib/ripple/orientation";
import { mapTiltToScreen, tiltToGravity } from "@/lib/ripple/orientation";

type Props = {
  sensors: SensorsState;
  orientationAngle?: ScreenAngle;
  onPaintStart?: () => void;
  onSplats?: (splats: Splat[]) => void;
  injectSplats?: Splat[] | null;
  injectKey?: number;
  cameraSource?: TexImageSource | null;
  remoteMicLevel?: number;
  remoteMicBands?: number[] | null;
  remoteGyro?: { beta: number; gamma: number; angle?: ScreenAngle } | null;
  webglError?: (message: string) => void;
  onReady?: () => void;
};

export function RippleCanvas({
  sensors,
  orientationAngle = 0,
  onPaintStart,
  onSplats,
  injectSplats,
  injectKey = 0,
  cameraSource,
  remoteMicLevel = 0,
  remoteMicBands = null,
  remoteGyro = null,
  webglError,
  onReady,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<RippleEngine | null>(null);
  const painterRef = useRef(new PointerPainter());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onPaintStartRef = useRef(onPaintStart);
  onPaintStartRef.current = onPaintStart;
  const onSplatsRef = useRef(onSplats);
  onSplatsRef.current = onSplats;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const remoteMicRef = useRef(remoteMicLevel);
  remoteMicRef.current = remoteMicLevel;
  const remoteBandsRef = useRef(remoteMicBands);
  remoteBandsRef.current = remoteMicBands;
  const remoteGyroRef = useRef(remoteGyro);
  remoteGyroRef.current = remoteGyro;

  const worldId = useRippleStore((s) => s.worldId);
  const viscosity = useRippleStore((s) => s.viscosity);
  const waveStrength = useRippleStore((s) => s.waveStrength);
  const brushDiameter = useRippleStore((s) => s.brushDiameter);
  const brushId = useRippleStore((s) => s.brushId);
  const brushFxSig = useRippleStore((s) => asFxList(s.brushFx[s.brushId]).join(","));
  const brushFxOpacity = useRippleStore((s) => s.brushFxOpacity);
  const cameraInteract = useRippleStore((s) => s.cameraInteract);
  const micSensitivity = useRippleStore((s) => s.micSensitivity);
  const micSensRef = useRef(micSensitivity);
  micSensRef.current = micSensitivity;
  const gyroSensitivity = useRippleStore((s) => s.gyroSensitivity);
  const gyroSensRef = useRef(gyroSensitivity);
  gyroSensRef.current = gyroSensitivity;
  const clearToken = useRippleStore((s) => s.clearToken);
  const nextWorld = useRippleStore((s) => s.nextWorld);
  const prevWorld = useRippleStore((s) => s.prevWorld);
  const rangeStart = useRippleStore((s) => {
    const r = s.colorRanges[s.worldId];
    if (r) return r.start;
    return PALETTES[s.worldId]?.defaultRange[0] ?? 0;
  });
  const rangeEnd = useRippleStore((s) => {
    const r = s.colorRanges[s.worldId];
    if (r) return r.end;
    return PALETTES[s.worldId]?.defaultRange[1] ?? 1;
  });
  const colorPairKey = useRippleStore((s) => {
    const pair = s.colorPairs[s.worldId];
    const p = PALETTES[s.worldId] ?? PALETTES.lens;
    return `${pair?.key ?? p.key}|${pair?.shadow ?? p.shadow}`;
  });
  const colorStopsSig = useRippleStore((s) => {
    const stops = s.colorStops[s.worldId];
    if (!stops?.length) return "";
    return stops.map((x) => `${x.id}:${x.color}:${x.t.toFixed(3)}:${x.alpha ?? 1}`).join("|");
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let engine: RippleEngine;
    try {
      engine = new RippleEngine(canvas);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(err);
      webglError?.(message);
      onReadyRef.current?.();
      return;
    }
    engineRef.current = engine;
    engine.onFirstFrame(() => onReadyRef.current?.());
    engine.resize();
    engine.start();

    const painter = painterRef.current;
    const brush = getBrush(brushId);
    painter.setBrush(
      brushDiameter / 2,
      brush.force,
      brush.kind,
      brush.spread ?? 1.8,
      brush.grains ?? 4,
      brush.feel ?? "steady",
      brush.nib ?? Math.PI / 4,
    );
    const swipe = createStrokeTracker();

    const onSplatFrame = (splats: Splat[]) => {
      engine.applySplats(splats);
      onSplatsRef.current?.(splats);
    };

    const unbind = bindPainter(canvas, painter, {
      onSplatFrame,
      onDown: () => {
        onPaintStartRef.current?.();
      },
    });

    const onPointerDown = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      swipe.down(
        (e.clientX - r.left) / Math.max(1, r.width),
        (e.clientY - r.top) / Math.max(1, r.height),
        e.timeStamp,
      );
    };
    const onPointerMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      swipe.move(
        (e.clientX - r.left) / Math.max(1, r.width),
        (e.clientY - r.top) / Math.max(1, r.height),
        e.timeStamp,
      );
    };
    const onPointerUp = () => {
      const dir = swipe.up();
      if (dir === "left") nextWorld();
      else if (dir === "right") prevWorld();
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);

    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas);

    return () => {
      unbind();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setParams({
      viscosity,
      waveStrength,
      colors: useRippleStore.getState().getActiveColors(),
      stops: useRippleStore.getState().getActiveStops(),
      rangeStart,
      rangeEnd,
      cameraMix: sensors.cameraOn || cameraSource ? 1 : 0,
      cameraInteract: sensors.cameraOn || cameraSource ? Math.max(0.95, cameraInteract) : cameraInteract,
      brushFx: fxMask(asFxList(useRippleStore.getState().getActiveBrushFx())),
      fxOpacity: brushFxOpacity,
    });
  }, [
    worldId,
    viscosity,
    waveStrength,
    rangeStart,
    rangeEnd,
    sensors.cameraOn,
    cameraSource,
    cameraInteract,
    colorPairKey,
    colorStopsSig,
    brushFxSig,
    brushFxOpacity,
  ]);

  useEffect(() => {
    const brush = getBrush(brushId);
    painterRef.current.setBrush(
      brushDiameter / 2,
      brush.force,
      brush.kind,
      brush.spread ?? 1.8,
      brush.grains ?? 4,
      brush.feel ?? "steady",
      brush.nib ?? Math.PI / 4,
    );
  }, [brushDiameter, brushId]);

  useEffect(() => {
    if (clearToken > 0) engineRef.current?.clear();
  }, [clearToken]);

  useEffect(() => {
    if (!injectSplats?.length) return;
    engineRef.current?.applySplats(injectSplats);
  }, [injectKey, injectSplats]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (cameraSource) {
      engine.setCamera(cameraSource, {
        angle: orientationAngle,
        mirror: false,
      });
      return;
    }

    const stream = sensors.cameraOn ? sensors.cameraStream : null;
    if (!stream) {
      if (videoRef.current) videoRef.current.srcObject = null;
      engine.setCamera(null);
      return;
    }

    let video = videoRef.current;
    if (!video) {
      video = document.createElement("video");
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.style.display = "none";
      document.body.appendChild(video);
      videoRef.current = video;
    }

    video.srcObject = stream;
    const play = () => {
      video!.play().catch(() => {});
    };
    play();
    video.addEventListener("loadedmetadata", play);

    engine.setCamera(video, {
      angle: orientationAngle,
      mirror: sensors.facingMode === "user",
    });

    return () => {
      video?.removeEventListener("loadedmetadata", play);
    };
  }, [
    sensors.cameraOn,
    sensors.cameraStream,
    sensors.facingMode,
    worldId,
    orientationAngle,
    cameraSource,
  ]);

  useEffect(() => {
    engineRef.current?.setCameraOrientation(orientationAngle);
  }, [orientationAngle]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const mode = sensors.gyroMode ?? (sensors.gyroOn ? "on" : "off");
    const localOn = mode !== "off";
    const axis = mode === "horizontal" || mode === "vertical" ? mode : "on";
    let rest: { x: number; y: number } | null = null;
    let restFrames = 0;
    let gotDevice = false;
    let lastAngle = orientationAngle;

    const applyScreen = (sx: number, sy: number, fromDevice: boolean) => {
      if (fromDevice) gotDevice = true;
      const g = tiltToGravity(sx, sy, axis, gyroSensRef.current);
      engine.setGravity(g.gx, g.gy);
    };

    const applyDevice = (beta: number, gamma: number, ang: ScreenAngle) => {
      if (ang !== lastAngle) {
        rest = null;
        restFrames = 0;
        lastAngle = ang;
      }
      const screen = mapTiltToScreen(beta, gamma, ang);
      if (!rest || restFrames < 10) {
        rest = screen;
        restFrames++;
        engine.setGravity(0, 0);
        return;
      }
      rest = {
        x: rest.x * 0.97 + screen.x * 0.03,
        y: rest.y * 0.97 + screen.y * 0.03,
      };
      applyScreen(screen.x - rest.x, screen.y - rest.y, true);
    };

    const onOrient = (e: DeviceOrientationEvent) => {
      applyDevice(e.beta ?? 0, e.gamma ?? 0, orientationAngle);
    };

    const onMouse = (e: MouseEvent) => {
      if (gotDevice) return;
      const nx = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      const ny = -(e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
      applyScreen(nx * 18, ny * 18, false);
    };

    if (localOn) window.addEventListener("deviceorientation", onOrient);
    if (localOn) window.addEventListener("mousemove", onMouse);

    let raf = 0;
    const tickRemote = () => {
      raf = requestAnimationFrame(tickRemote);
      const remote = remoteGyroRef.current;
      if (!remote) return;
      applyDevice(remote.beta, remote.gamma, remote.angle ?? 0);
    };
    tickRemote();

    return () => {
      window.removeEventListener("deviceorientation", onOrient);
      window.removeEventListener("mousemove", onMouse);
      if (raf) cancelAnimationFrame(raf);
      engine.setGravity(0, 0);
    };
  }, [sensors.gyroOn, sensors.gyroMode, orientationAngle]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const stream = sensors.micOn ? sensors.micStream : null;
    let monitor: ReturnType<typeof createMicMonitor> | null = null;
    if (stream) {
      try {
        monitor = createMicMonitor(stream);
      } catch {
        engine.setMicPulse(0);
      }
    }

    let raf = 0;
    let env: MicFrame = { ...SILENT_MIC };
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const raw = monitor
        ? monitor.read()
        : micFromRemote(remoteMicRef.current, remoteBandsRef.current);
      env = tickMicEnvelope(env, raw, micSensRef.current);
      engine.setMicPulse(env);
    };
    tick();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      monitor?.stop();
      engine.setMicPulse(0);
    };
  }, [sensors.micOn, sensors.micStream]);

  useEffect(() => {
    return () => {
      const v = videoRef.current;
      if (v) {
        v.srcObject = null;
        v.remove();
        videoRef.current = null;
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full touch-none"
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        touchAction: "none",
        cursor: "crosshair",
      }}
    />
  );
}
