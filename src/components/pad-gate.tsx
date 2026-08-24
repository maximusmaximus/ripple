import { useCallback, useEffect, type ReactNode } from "react";
import { useCastPad } from "@/hooks/use-cast-pad";
import type { Splat } from "@/lib/ripple/pointer";

export type PadHandle = {
  isLive: boolean;
  sendSplats: (s: Splat[]) => void;
  sendWorld: (id: string) => void;
  sendFeel: (viscosity: number, waveStrength: number, brushDiameter: number) => void;
  sendGyro: (alpha: number, beta: number, gamma: number, ang?: 0 | 90 | 180 | 270) => void;
  sendMic: (level: number, bands?: number[]) => void;
  startCameraLoop: () => Promise<void>;
};

type Props = {
  code: string;
  children: (pad: PadHandle) => ReactNode;
};

export function PadGate({ code, children }: Props) {
  const pad = useCastPad({ code });
  const connect = pad.connect;
  const startCameraLoop = pad.startCameraLoop;

  const handleConnect = useCallback(async () => {
    await connect();
    // Request camera in the same tap so iOS/Safari grants getUserMedia.
    void startCameraLoop();
  }, [connect, startCameraLoop]);

  useEffect(() => {
    if (pad.isLive) void startCameraLoop();
  }, [pad.isLive, startCameraLoop]);

  if (pad.isLive) {
    return (
      <>
        {children({
          isLive: true,
          sendSplats: pad.sendSplats,
          sendWorld: pad.sendWorld,
          sendFeel: pad.sendFeel,
          sendGyro: pad.sendGyro,
          sendMic: pad.sendMic,
          startCameraLoop: pad.startCameraLoop,
        })}
      </>
    );
  }

  return (
    <div className="flex h-dvh w-dvw flex-col items-center justify-center gap-6 bg-ink px-6 text-center text-fg">
      <div className="max-w-sm space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-subtle">Phone pad</p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Stream to the big screen
        </h1>
        <p className="text-sm text-muted">
          Code <span className="font-mono tracking-widest text-fg/80">{code}</span>
        </p>
      </div>

      {pad.state === "error" && (
        <p className="rounded-lg bg-rose-500/15 px-4 py-2 text-sm text-rose-300">{pad.error}</p>
      )}

      <button
        type="button"
        onClick={handleConnect}
        disabled={pad.state === "connecting"}
        className="rounded-full bg-fg px-8 py-3.5 text-sm font-semibold text-ink transition active:scale-95 disabled:opacity-50"
      >
        {pad.state === "connecting" ? "Connecting…" : "Start streaming"}
      </button>

      <p className="max-w-xs text-xs text-pretty text-subtle">
        Touch, tilt, and camera stream to the wall. Nothing is uploaded.
      </p>
    </div>
  );
}
