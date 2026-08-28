/**
 * Phone pad — streams pointer, gyro, mic, optional camera JPEG, world to wall.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { P2PRoom } from "@/lib/multiplayer";
import { encodeCamB64, parseCastMsg, roomIdFor, type CastMsg } from "@/lib/ripple/cast";
import { createRecInbox, offerDownload, isLanPeer, type PendingClip } from "@/lib/ripple/record";
import type { Splat } from "@/lib/ripple/pointer";
import type { StudioSnapshot } from "@/lib/ripple/studio";

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

function padIdentity(): string {
  const key = "ripple-pad-id";
  try {
    const existing = window.localStorage.getItem(key);
    if (existing && existing.length >= 8) return existing;
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(key, id);
    return id;
  } catch {
    return makePeerId("pad");
  }
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
  const recInbox = useRef(createRecInbox());
  const [recOn, setRecOn] = useState(false);
  const [recStartedAt, setRecStartedAt] = useState<number | null>(null);
  const [recLimitMs, setRecLimitMs] = useState(30_000);
  const [recRemainingMs, setRecRemainingMs] = useState(0);
  const [recSaving, setRecSaving] = useState(false);
  const [pendingClip, setPendingClip] = useState<PendingClip | null>(null);
  const [recNote, setRecNote] = useState<string | null>(null);
  const [lanHd, setLanHd] = useState(false);
  const padIdRef = useRef(padIdentity());

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
    encodingRef.current = false;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const stopOwnedStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    stopMedia();
    stopOwnedStream();
    p2pRef.current?.close();
    p2pRef.current = null;
    setLanHd(false);
  }, [stopMedia, stopOwnedStream]);

  const bindCameraStream = useCallback(
    (stream: MediaStream | null) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      encodingRef.current = false;
      if (!stream) {
        if (videoRef.current) videoRef.current.srcObject = null;
        return;
      }
      let video = videoRef.current;
      if (!video) {
        video = document.createElement("video");
        video.playsInline = true;
        video.muted = true;
        video.autoplay = true;
        videoRef.current = video;
      }
      video.srcObject = stream;
      void video.play().catch(() => {});
      const canvas = document.createElement("canvas");
      canvas.width = frameWidth;
      canvas.height = frameHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const interval = 1000 / fps;
      const tick = () => {
        rafRef.current = requestAnimationFrame(tick);
        const now = performance.now();
        if (now - lastFrameAt.current < interval) return;
        if (encodingRef.current) return;
        lastFrameAt.current = now;
        try {
          ctx.drawImage(video, 0, 0, frameWidth, frameHeight);
        } catch {
          return;
        }
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
    },
    [frameHeight, frameWidth, fps, jpegQuality, sendJson],
  );

  const startCameraLoop = useCallback(async () => {
    /* Camera is opened from the HUD so front/rear cycling owns the tracks. */
  }, []);

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
        const wall = peers.find((p) => p.name === "wall" && p.connectionState === "connected");
        setLanHd(Boolean(wall && isLanPeer(wall)));
        const failed = peers.every((p) => p.connectionState === "failed") && peers.length > 0;
        if (live) {
          setState("connected");
          try {
            p2p.send({ t: "hello", role: "pad", code, padId: padIdRef.current } satisfies CastMsg);
          } catch {
            /* channel may not be ready yet */
          }
        } else if (failed) {
          setState("error");
          setError("Could not reach the display — same Wi-Fi helps");
        } else if (p2pRef.current) {
          setState((prev) => {
            if (prev === "connected") {
              setError("Display lost — tap to reconnect");
              return "idle";
            }
            return prev;
          });
        }
      },
      onMessage: (_from, data) => {
        const msg = parseCastMsg(data);
        if (!msg) return;
        if (msg.t === "bye") {
          cleanup();
          setState("idle");
          return;
        }
        if (msg.t === "lan-hd") {
          setLanHd(msg.on);
          return;
        }
        if (msg.t === "rec-state") {
          setRecOn(msg.on);
          setRecStartedAt(msg.on ? msg.startedAt : null);
          setRecLimitMs(msg.limitMs);
          setRecRemainingMs(msg.on ? msg.limitMs : 0);
          setRecSaving(false);
          if (msg.on) setRecNote(null);
          return;
        }
        if (msg.t === "rec-meta") {
          recInbox.current.reset(msg);
          setRecSaving(true);
          return;
        }
        if (msg.t === "rec-chunk") {
          recInbox.current.add(msg.i, msg.b64);
          return;
        }
        if (msg.t === "rec-done") {
          const file = recInbox.current.assemble();
          setRecSaving(false);
          setRecOn(false);
          if (file) {
            setPendingClip(offerDownload(file.blob, file.name));
            setRecNote("Clip ready on this phone and the wall");
          }
          return;
        }
        if (msg.t === "rec-skip") {
          setRecSaving(false);
          setRecOn(false);
          setRecNote(
            msg.reason === "hd-local"
              ? "HD clip saved on the wall"
              : "Clip saved on the wall — too large to send here",
          );
        }
      },
      onConnected: () => {
        try {
          p2p.send({ t: "hello", role: "pad", code, padId: padIdRef.current } satisfies CastMsg);
        } catch {
          /* ignore */
        }
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
  const sendStudio = useCallback(
    (snap: StudioSnapshot) => {
      sendJson({ t: "studio", snap }, true);
    },
    [sendJson],
  );
  const sendClear = useCallback(() => {
    sendJson({ t: "clear" }, true);
  }, [sendJson]);

  const sendRec = useCallback(
    (on: boolean) => {
      sendJson({ t: "rec", on }, true);
    },
    [sendJson],
  );

  const sendLiveMeta = useCallback(
    (title: string, description: string, watchable: boolean) => {
      sendJson({ t: "live-meta", title, description, watchable }, true);
    },
    [sendJson],
  );

  useEffect(() => {
    if (!recOn || !recStartedAt) return;
    const tick = () => setRecRemainingMs(Math.max(0, recLimitMs - (Date.now() - recStartedAt)));
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [recOn, recStartedAt, recLimitMs]);

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
    sendStudio,
    sendClear,
    sendRec,
    sendLiveMeta,
    recOn,
    recStartedAt,
    recLimitMs,
    recRemainingMs,
    recSaving,
    pendingClip,
    recNote,
    lanHd,
    clearPendingClip: () => setPendingClip(null),
    startCameraLoop,
    bindCameraStream,
    stopMedia,
  };
}
