import { useCallback, useEffect, useRef, useState } from "react";
import { useCastHost, type RemoteFrame, type RemoteInput } from "@/hooks/use-cast-host";
import { QrMark } from "./qr-mark";
import { RippleCanvas } from "./ripple-canvas";
import { RippleSplash, useSurfaceSplash } from "./ripple-splash";
import { emptySensorsState, type SensorsState } from "@/lib/ripple/media";
import { useRippleStore } from "@/store/ripple";
import { PALETTES, type PaletteId } from "@/lib/ripple/palettes";
import type { Splat } from "@/lib/ripple/pointer";
import { useOrientation } from "@/hooks/use-orientation";

type Props = {
  preferredCode?: string | null;
};

export function WallViewport({ preferredCode }: Props) {
  const { angle } = useOrientation();
  const setWorld = useRippleStore((s) => s.setWorld);
  const setViscosity = useRippleStore((s) => s.setViscosity);
  const setWaveStrength = useRippleStore((s) => s.setWaveStrength);
  const setBrushDiameter = useRippleStore((s) => s.setBrushDiameter);

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
    } catch (err) {
      console.warn("[wall] frame decode failed", err);
    }
  }, []);

  const onRemoteInput = useCallback(
    (input: RemoteInput) => {
      if (input.splats?.length) {
        setInjectSplats(input.splats);
        setInjectKey((n) => n + 1);
      }
      if (input.ptr?.down) {
        setInjectSplats([
          { x: input.ptr.x, y: input.ptr.y, force: 0.55, radius: 0.03 },
        ]);
        setInjectKey((n) => n + 1);
      }
      if (input.worldId && input.worldId in PALETTES) {
        setWorld(input.worldId as PaletteId);
      }
      if (input.feel) {
        setViscosity(input.feel.viscosity);
        setWaveStrength(input.feel.waveStrength);
        setBrushDiameter(input.feel.brushDiameter);
      }
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
    [setWorld, setViscosity, setWaveStrength, setBrushDiameter],
  );

  const host = useCastHost({ preferredCode, onCamFrame, onRemoteInput });
  const splash = useSurfaceSplash();

  useEffect(() => () => lastBmp.current?.close(), []);

  const sensors: SensorsState = emptySensorsState;
  const showPair = host.showPairUI;

  return (
    <div
      className="relative h-dvh w-dvw overflow-hidden bg-ink"
      data-wall="true"
      data-cast-state={host.state}
    >
      <RippleCanvas
        sensors={sensors}
        orientationAngle={angle}
        injectSplats={injectSplats}
        injectKey={injectKey}
        cameraSource={camSource}
        remoteMicLevel={remoteMic}
        remoteMicBands={remoteMicBands}
        remoteGyro={remoteGyro}
        onReady={splash.markReady}
      />

      {host.isLive && (
        <div className="absolute left-4 top-4 z-30 flex items-center gap-2 rounded-full bg-ink/50 px-3 py-1.5 text-xs text-fg/80 backdrop-blur-md">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          Live from phone
          <button
            type="button"
            onClick={host.disconnect}
            className="ml-1 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-subtle hover:bg-fg/10 hover:text-fg"
          >
            End
          </button>
        </div>
      )}

      <div
        className={`absolute inset-0 z-20 flex flex-col items-center justify-center transition-all duration-500 ${
          showPair ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none scale-95"
        }`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{ background: "radial-gradient(ellipse at 50% 40%, #1a1a2e 0%, #07070c 70%)" }}
        />

        <div className="relative z-10 flex max-w-[min(92vw,480px)] flex-col items-center gap-5 rounded-3xl border border-line bg-ink/70 p-6 shadow-2xl backdrop-blur-xl">
          <div className="text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-subtle">
              Second display
            </p>
            <h2 className="mt-1 text-lg font-semibold text-fg">
              {host.state === "waiting"
                ? "Connecting…"
                : host.state === "reconnecting"
                  ? "Reconnecting…"
                  : "Scan to cast"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Open this on your phone to paint the wall in real time
            </p>
          </div>

          {host.pairUrl ? (
            <div className="rounded-2xl bg-fg p-3 shadow-inner">
              <QrMark value={host.pairUrl} size={280} />
            </div>
          ) : null}

          <div className="flex w-full flex-col items-center gap-2">
            <p className="font-mono text-2xl tracking-[0.35em] text-fg">{host.code}</p>
            <p className="text-center text-[11px] text-subtle">
              or open the same site on your phone with this code
            </p>
          </div>

          {host.lastError && (
            <p className="rounded-lg bg-rose-500/15 px-3 py-1.5 text-center text-xs text-rose-300">
              {host.lastError} — showing QR again
            </p>
          )}

          <button
            type="button"
            onClick={host.regenerateCode}
            className="rounded-full border border-line bg-fg/5 px-4 py-1.5 text-xs text-muted transition hover:bg-fg/10 hover:text-fg"
          >
            New code
          </button>
        </div>

        <div className="relative z-10 mt-6 flex items-center gap-2 text-xs text-subtle">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              host.state === "waiting"
                ? "animate-pulse bg-amber-400"
                : host.state === "reconnecting"
                  ? "animate-pulse bg-rose-400"
                  : "bg-fg/30"
            }`}
          />
          {host.state === "waiting"
            ? "Phone detected — finishing handshake"
            : host.state === "reconnecting"
              ? "Connection lost"
              : "Waiting for a phone"}
        </div>
      </div>

      {splash.show && <RippleSplash fading={splash.fading} />}
    </div>
  );
}
