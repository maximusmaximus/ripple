import { Eye } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCastHost, type RemoteFrame, type RemoteInput } from "@/hooks/use-cast-host";
import { QrMark } from "./qr-mark";
import { VoidrideHold, useVoidrideGate, VoidrideListen, useVoidrideLatest } from "./voidride-hold";
import { RippleCanvas } from "./ripple-canvas";
import { LanHdToast } from "./lan-hd-toast";
import { emptySensorsState, type SensorsState } from "@/lib/ripple/media";
import { useRippleStore } from "@/store/ripple";
import { PALETTES, type PaletteId } from "@/lib/ripple/palettes";
import type { Splat } from "@/lib/ripple/pointer";
import { hydrateSnapshotMedia } from "@/lib/ripple/studio";
import { useOrientation } from "@/hooks/use-orientation";
import { useCanvasRecord } from "@/hooks/use-canvas-record";
import { useLivePresence } from "@/hooks/use-live-presence";
import { EMPTY_SHARE } from "./session-share";
import { useViewStream } from "@/hooks/use-view-stream";
import { formatCountdown, sendRecBlob, recordProfileFor } from "@/lib/ripple/record";
import { VOIDRIDE_HOLD_MS } from "@/lib/voidride";
import type { CastMsg } from "@/lib/ripple/cast";

type Props = {
  preferredCode?: string | null;
};

export function WallViewport({ preferredCode }: Props) {
  const { angle } = useOrientation();
  const setWorld = useRippleStore((s) => s.setWorld);
  const setViscosity = useRippleStore((s) => s.setViscosity);
  const setWaveStrength = useRippleStore((s) => s.setWaveStrength);
  const setBrushDiameter = useRippleStore((s) => s.setBrushDiameter);
  const applySnapshot = useRippleStore((s) => s.applySnapshot);
  const clearSurface = useRippleStore((s) => s.clearSurface);

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

  const hostSendRef = useRef<(msg: CastMsg) => void>(() => {});
  const hostLiveRef = useRef(false);
  const lanHdRef = useRef(false);
  const recRef = useRef<{ start: () => boolean; stop: () => void } | null>(null);

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

  const presenceRef = useRef<ReturnType<typeof useLivePresence> | null>(null);
  const hostRegenRef = useRef<(() => void) | null>(null);
  const host = useCastHost({
    preferredCode,
    stayOnPage: true,
    onCamFrame,
    onRemoteInput,
    onRecToggle: (on) => {
      if (on) recRef.current?.start();
      else recRef.current?.stop();
    },
    onLiveMeta: (meta) => {
      void presenceRef.current?.updateMeta(meta);
    },
    onPadAbandoned: () => {
      void presenceRef.current?.updateMeta(EMPTY_SHARE);
      useRippleStore.getState().cleanSession();
      hostRegenRef.current?.();
    },
  });
  hostSendRef.current = host.send;
  hostLiveRef.current = host.isLive;
  lanHdRef.current = host.lanHd;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const presence = useLivePresence({
    role: "host",
    code: host.code || null,
    enabled: Boolean(host.code),
  });
  presenceRef.current = presence;
  hostRegenRef.current = host.regenerateCode;
  useViewStream(canvasRef, host.broadcast, host.viewerCount);
  const record = useCanvasRecord(() => canvasRef.current, {
    profile: () => recordProfileFor(lanHdRef.current),
    onBlob: async (blob, name, profile) => {
      if (!hostLiveRef.current) return;
      if (profile === "lanHd") {
        hostSendRef.current({ t: "rec-skip", reason: "hd-local" });
        return;
      }
      await sendRecBlob((m) => hostSendRef.current(m), blob, name);
    },
  });
  recRef.current = record;
  const ready = Boolean(host.pairUrl && host.code);
  const [gaveUp, setGaveUp] = useState(false);
  const { locked, flash, progress } = useVoidrideGate();
  const drop = useVoidrideLatest();

  useEffect(() => {
    if (ready) return;
    const t = window.setTimeout(() => setGaveUp(true), VOIDRIDE_HOLD_MS + 800);
    return () => window.clearTimeout(t);
  }, [ready]);

  useEffect(() => {
    if (!host.isLive) return;
    if (record.state === "recording" && record.startedAt) {
      host.send({ t: "rec-state", on: true, startedAt: record.startedAt, limitMs: record.limitMs });
    } else if (record.state === "idle") {
      host.send({ t: "rec-state", on: false, startedAt: 0, limitMs: record.limitMs });
    }
  }, [host.isLive, host.send, record.state, record.startedAt, record.limitMs]);

  useEffect(() => () => lastBmp.current?.close(), []);

  const sensors: SensorsState = emptySensorsState;
  const showPair = host.showPairUI;

  return (
    <div
      className="relative h-dvh w-dvw overflow-hidden bg-ink"
      data-wall="true"
      data-cast-state={host.state}
      data-lan-hd={host.lanHd ? "1" : "0"}
    >
      <RippleCanvas
        ref={canvasRef}
        sensors={sensors}
        orientationAngle={angle}
        injectSplats={injectSplats}
        injectKey={injectKey}
        cameraSource={camSource}
        remoteMicLevel={remoteMic}
        remoteMicBands={remoteMicBands}
        remoteGyro={remoteGyro}
      />

      <LanHdToast on={host.lanHd} />

      {(host.viewerCount > 0 || host.lanHd) && (
        <div
          data-ui-chrome
          className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-end gap-1.5 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))]"
        >
          {host.lanHd && (
            <span
              data-lan-hd="true"
              className="inline-flex h-11 items-center gap-1.5 rounded-full border border-ripple/50 bg-ink/70 px-2.5 text-[11px] font-semibold tracking-wide text-ripple backdrop-blur-md"
              title="Same network — HD saves on this wall"
            >
              HD
            </span>
          )}
          {host.viewerCount > 0 && (
          <span
            data-live-viewers={host.viewerCount}
            className="inline-flex h-11 items-center gap-1.5 rounded-full border border-emerald-400/40 bg-ink/70 px-2.5 text-[11px] font-semibold tabular-nums text-emerald-100 backdrop-blur-md"
            title={host.viewerCount === 1 ? "1 watching" : `${host.viewerCount} watching`}
          >
            <Eye className="size-3.5" strokeWidth={1.75} />
            {host.viewerCount}
          </span>
          )}
        </div>
      )}

      {record.state === "recording" && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-center pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="rec-live flex items-center gap-2 rounded-full border border-red-400/80 bg-red-700/90 px-3 py-1 text-[11px] font-medium tracking-wide text-white shadow-lg">
            <span className="inline-block size-2 rounded-full bg-white" />
            {formatCountdown(record.remainingMs)} left
            {record.profile === "lanHd" ? " · HD on this wall" : " · both screens save"}
          </div>
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

        <div
          className={
            "relative z-10 flex max-w-[min(92vw,480px)] flex-col items-center gap-5 rounded-3xl border border-line bg-ink/70 p-6 shadow-2xl backdrop-blur-xl" +
            (flash ? " voidride-edge-flash" : "")
          }
        >
          <div className="text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-subtle">
              Second display
            </p>
            <h2 className="mt-1 text-lg font-semibold text-fg">
              {host.state === "waiting"
                ? "Connecting…"
                : host.state === "reconnecting"
                  ? "Phone dropped"
                  : "Scan to cast"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {host.state === "reconnecting"
                ? "Scan again. The menu moves to the phone; this wall stays clean."
                : "Open this on your phone to paint the wall in real time"}
            </p>
          </div>

          {locked || !(host.pairUrl && (ready || gaveUp)) ? (
            <div className="w-full overflow-hidden rounded-2xl">
              <VoidrideHold progress={progress} />
            </div>
          ) : (
            <div className="rounded-2xl bg-fg p-3 shadow-inner">
              <QrMark value={host.pairUrl} size={280} />
            </div>
          )}

          <div className="flex w-full flex-col items-center gap-2">
            <p className="font-mono text-2xl tracking-[0.35em] text-fg">{host.code}</p>
            <p className="text-center text-[11px] text-subtle">
              or open the same site on your phone with this code
            </p>
            {drop ? <VoidrideListen drop={drop} /> : null}
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

    </div>
  );
}
