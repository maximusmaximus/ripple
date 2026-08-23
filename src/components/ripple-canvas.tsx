import { useEffect, useRef } from "react";
import { RippleEngine } from "@/lib/ripple/engine";
import { PointerPainter, bindPainter, type Splat } from "@/lib/ripple/pointer";
import { createStrokeTracker } from "@/lib/ripple/gestures";
import { useRippleStore } from "@/store/ripple";
import { PALETTES } from "@/lib/ripple/palettes";
import { getBrush } from "@/lib/ripple/brushes";
import type { SensorsState } from "@/lib/ripple/media";
import type { ScreenAngle } from "@/lib/ripple/orientation";

type Props = {
  sensors: SensorsState;
  orientationAngle?: ScreenAngle;
  onPaintStart?: () => void;
  onSplats?: (splats: Splat[]) => void;
  injectSplats?: Splat[] | null;
  injectKey?: number;
  cameraSource?: TexImageSource | null;
  remoteMicLevel?: number;
  webglError?: (message: string) => void;
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
  webglError,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<RippleEngine | null>(null);
  const painterRef = useRef(new PointerPainter());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onPaintStartRef = useRef(onPaintStart);
  onPaintStartRef.current = onPaintStart;
  const onSplatsRef = useRef(onSplats);
  onSplatsRef.current = onSplats;

  const worldId = useRippleStore((s) => s.worldId);
  const viscosity = useRippleStore((s) => s.viscosity);
  const waveStrength = useRippleStore((s) => s.waveStrength);
  const brushDiameter = useRippleStore((s) => s.brushDiameter);
  const brushId = useRippleStore((s) => s.brushId);
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
      return;
    }
    engineRef.current = engine;
    engine.resize();
    engine.start();

    const painter = painterRef.current;
    const b0 = getBrush(brushId);
    painter.setBrush(b0.radius, b0.force, b0.kind);
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
    const palette = PALETTES[worldId] ?? PALETTES.abyss;
    engine.setParams({
      viscosity,
      waveStrength,
      colors: palette.colors,
      rangeStart,
      rangeEnd,
      cameraMix:
        sensors.cameraOn || cameraSource
          ? Math.max(0.55, Math.min(1, (palette.cameraMix ?? 0.55) * 1.15 + 0.2))
          : 0,
      // Strokes pull and warp the feed; high default so faces/objects ride the mark
      cameraInteract: sensors.cameraOn || cameraSource ? 0.9 : 0,
    });
  }, [worldId, viscosity, waveStrength, rangeStart, rangeEnd, sensors.cameraOn, cameraSource]);

  useEffect(() => {
    const b = getBrush(brushId);
    // Wave strength slightly scales weight so lively worlds still bite
    const force = b.force * (0.85 + waveStrength * 0.2);
    painterRef.current.setBrush(b.radius, force, b.kind);
  }, [brushId, brushDiameter, waveStrength]);

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
        mix: Math.max(0.6, Math.min(1, ((PALETTES[worldId] ?? PALETTES.abyss).cameraMix ?? 0.55) * 1.15 + 0.2)),
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
      mix: Math.max(0.6, Math.min(1, ((PALETTES[worldId] ?? PALETTES.abyss).cameraMix ?? 0.55) * 1.15 + 0.2)),
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
    if (!sensors.gyroOn) return;

    let lastT = 0;
    const onOrient = (e: DeviceOrientationEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      const now = performance.now();
      if (now - lastT < 50) return;
      lastT = now;

      const beta = e.beta ?? 0;
      const gamma = e.gamma ?? 0;
      const nx = 0.5 + Math.max(-0.35, Math.min(0.35, gamma / 45));
      const ny = 0.5 + Math.max(-0.35, Math.min(0.35, beta / 60));
      const mag = Math.min(1, Math.hypot(gamma / 45, beta / 60));
      if (mag < 0.06) return;

      engine.applySplats([
        {
          x: nx,
          y: ny,
          radius: 0.12 + mag * 0.1,
          force: 0.012 + mag * 0.035,
        },
      ]);
    };

    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, [sensors.gyroOn]);

  useEffect(() => {
    const stream = sensors.micOn ? sensors.micStream : null;
    const engine = engineRef.current;
    if (!engine) return;

    if (!stream && remoteMicLevel <= 0.08) return;

    let ctx: AudioContext | null = null;
    let raf = 0;
    const palette = PALETTES[worldId] ?? PALETTES.abyss;
    const drive = palette.micDrive ?? 0.4;

    const splatFromLevel = (level: number) => {
      if (level < 0.1) return;
      engine.applySplats([
        {
          x: 0.5,
          y: 0.52,
          radius: 0.07 + level * 0.14,
          force: level * drive * 0.09,
        },
      ]);
    };

    if (stream) {
      ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        raf = requestAnimationFrame(tick);
        analyser.getByteFrequencyData(data);
        let sum = 0;
        const n = Math.min(24, data.length);
        for (let i = 0; i < n; i++) sum += data[i]!;
        splatFromLevel(sum / (n * 255));
      };
      tick();
    } else {
      splatFromLevel(remoteMicLevel);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      void ctx?.close();
    };
  }, [sensors.micOn, sensors.micStream, worldId, remoteMicLevel]);

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
