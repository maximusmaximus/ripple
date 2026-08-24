/**
 * Phone pad — streams pointer, gyro, mic, optional camera JPEG, world to wall.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { P2PRoom } from "@/lib/multiplayer";
import { encodeCamB64, parseCastMsg, roomIdFor, type CastMsg } from "@/lib/ripple/cast";
import type { Splat } from "@/lib/ripple/pointer";

export type PadConnectionState = "idle" | "connecting" | "connected" | "error";

export type UseCastPadOptions = {
  code: string;
  frameWidth?: number;
  frameHeight?: number;
  jpegQuality?: number;
  fps?: number;
};

function makePeerId(prefix: string) {
  return `${prefix}${Math.random().toString(36).slice(2, 10)}`;
}

export function useCastPad(opts: UseCastPadOptions) {
  const { code, frameWidth = 176, frameHeight = 132, jpegQuality = 0.38, fps = 8 } = opts;
  const [state, setState] = useState<PadConnectionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const p2pRef = useRef<P2PRoom | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef(0);
  const encodingRef = useRef(false);
  const lastFrameAt = useRef(0);

  const sendJson = useCallback((msg: CastMsg, reliable = true) => {
    const p2p = p2pRef.current;
    if (!p2p) return;
    try {
      if (reliable) p2p.send(msg);
      else p2p.broadcast(msg);
    } catch {
      /* ignore */
    }
  }, []);

  const stopMedia = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const cleanup = useCallback(() => {
    stopMedia();
    p2pRef.current?.close();
    p2pRef.current = null;
  }, [stopMedia]);

  const startCameraLoop = useCallback(async () => {
    if (streamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: frameWidth },
          height: { ideal: frameHeight },
          facingMode: "environment",
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = document.createElement("video");
      video.playsInline = true;
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      videoRef.current = video;
      const canvas = document.createElement("canvas");
      canvas.width = frameWidth;
      canvas.height = frameHeight;
      const ctx = canvas.getContext("2d")!;
      const interval = 1000 / fps;
      const tick = () => {
        rafRef.current = requestAnimationFrame(tick);
        const now = performance.now();
        if (now - lastFrameAt.current < interval) return;
        if (encodingRef.current) return;
        lastFrameAt.current = now;
        ctx.drawImage(video, 0, 0, frameWidth, frameHeight);
        encodingRef.current = true;
        canvas.toBlob(
          async (blob) => {
            encodingRef.current = false;
            if (!blob || !p2pRef.current) return;
            const buf = await blob.arrayBuffer();
            sendJson({ t: "cam", b64: encodeCamB64(buf) }, false);
          },
          "image/jpeg",
          jpegQuality,
        );
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setError(String(err));
    }
  }, [frameHeight, frameWidth, fps, jpegQuality, sendJson]);

  const connect = useCallback(async () => {
    setState("connecting");
    setError(null);
    cleanup();
    const selfId = makePeerId("p");
    const p2p = new P2PRoom({
      room: roomIdFor(code),
      selfId,
      name: "pad",
      onPeersChanged: (peers) => {
        const live = peers.some((p) => p.connectionState === "connected");
        const failed = peers.every((p) => p.connectionState === "failed") && peers.length > 0;
        if (live) setState("connected");
        else if (failed) {
          setState("error");
          setError("Could not reach the wall — same Wi-Fi helps");
        }
      },
      onMessage: (_from, data) => {
        const msg = parseCastMsg(data);
        if (msg?.t === "bye") {
          cleanup();
          setState("idle");
        }
      },
      onConnected: () => {
        /* roster registered; wait for data channel */
      },
    });
    p2pRef.current = p2p;
    await p2p.join();
  }, [cleanup, code]);

  const sendSplats = useCallback(
    (s: Splat[]) => {
      if (!s.length) return;
      sendJson({ t: "splats", s }, false);
    },
    [sendJson],
  );
  const sendPointer = useCallback(
    (x: number, y: number, down: boolean) => {
      sendJson({ t: "ptr", x, y, down }, false);
    },
    [sendJson],
  );
  const sendGyro = useCallback(
    (alpha: number, beta: number, gamma: number, ang?: 0 | 90 | 180 | 270) => {
      sendJson({ t: "gyro", alpha, beta, gamma, ang }, false);
    },
    [sendJson],
  );
  const sendMic = useCallback(
    (level: number, bands?: number[]) => {
      sendJson({ t: "mic", level, bands }, false);
    },
    [sendJson],
  );
  const sendWorld = useCallback(
    (id: string) => {
      sendJson({ t: "world", id }, true);
    },
    [sendJson],
  );
  const sendFeel = useCallback(
    (viscosity: number, waveStrength: number, brushDiameter: number) => {
      sendJson({ t: "feel", viscosity, waveStrength, brushDiameter }, true);
    },
    [sendJson],
  );

  const disconnect = useCallback(() => {
    sendJson({ t: "bye" }, true);
    cleanup();
    setState("idle");
  }, [cleanup, sendJson]);

  useEffect(() => () => cleanup(), [cleanup]);

  return {
    state,
    error,
    isLive: state === "connected",
    connect,
    disconnect,
    sendSplats,
    sendPointer,
    sendGyro,
    sendMic,
    sendWorld,
    sendFeel,
    startCameraLoop,
    stopMedia,
  };
}
