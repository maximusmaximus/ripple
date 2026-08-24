/**
 * Wall host — QR pair, then receive pad pointer / gyro / mic / camera / world.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { P2PRoom } from "@/lib/multiplayer";
import {
  decodeCamB64,
  makeCastCode,
  parseCastMsg,
  roomIdFor,
  type CastMsg,
} from "@/lib/ripple/cast";
import type { Splat } from "@/lib/ripple/pointer";
import type { PaletteId } from "@/lib/ripple/palettes";

export type HostConnectionState = "idle" | "waiting" | "connected" | "reconnecting";

export type RemoteInput = {
  splats?: Splat[];
  ptr?: { x: number; y: number; down: boolean };
  gyro?: { alpha: number; beta: number; gamma: number; angle?: 0 | 90 | 180 | 270 };
  mic?: { level: number; bands?: number[] };
  worldId?: PaletteId | string;
  feel?: { viscosity: number; waveStrength: number; brushDiameter: number };
};

export type RemoteFrame = { jpeg: ArrayBuffer; receivedAt: number };

export type UseCastHostOptions = {
  preferredCode?: string | null;
  onCamFrame?: (frame: RemoteFrame) => void;
  onRemoteInput?: (input: RemoteInput) => void;
};

function makePeerId(prefix: string) {
  return `${prefix}${Math.random().toString(36).slice(2, 10)}`;
}

export function useCastHost(opts: UseCastHostOptions = {}) {
  const [code, setCode] = useState(() => (opts.preferredCode || "").toUpperCase());
  const [state, setState] = useState<HostConnectionState>("idle");
  const [pairUrl, setPairUrl] = useState("");
  const [lastError, setLastError] = useState<string | null>(null);
  const p2pRef = useRef<P2PRoom | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (!code) setCode(makeCastCode());
  }, [code]);

  useEffect(() => {
    if (typeof window === "undefined" || !code) return;
    const u = new URL(window.location.href);
    u.search = "";
    u.searchParams.set("mode", "pad");
    u.searchParams.set("c", code);
    setPairUrl(u.toString());
  }, [code]);

  useEffect(() => {
    if (!code) return;
    const selfId = makePeerId("w");
    const p2p = new P2PRoom({
      room: roomIdFor(code),
      selfId,
      name: "wall",
      onPeersChanged: (peers) => {
        const live = peers.some((p) => p.connectionState === "connected");
        const waiting = peers.some(
          (p) => p.connectionState === "connecting" || p.connectionState === "new",
        );
        if (live) {
          setState("connected");
          setLastError(null);
        } else if (waiting) {
          setState("waiting");
        } else {
          setState("idle");
        }
      },
      onMessage: (_from, data) => {
        const msg = parseCastMsg(data);
        if (!msg) return;
        handleMsg(msg, optsRef.current);
      },
      onConnected: () => setState((s) => (s === "idle" ? "idle" : s)),
    });
    p2pRef.current = p2p;
    void p2p.join();
    return () => {
      p2pRef.current = null;
      p2p.close();
    };
  }, [code]);

  const regenerateCode = useCallback(() => {
    if (typeof window === "undefined") return;
    const next = makeCastCode();
    const u = new URL(window.location.href);
    u.searchParams.set("mode", "wall");
    u.searchParams.set("c", next);
    window.location.assign(`${u.pathname}${u.search}`);
  }, []);

  const disconnect = useCallback(() => {
    try {
      p2pRef.current?.send({ t: "bye" } satisfies CastMsg);
    } catch {
      /* ignore */
    }
    p2pRef.current?.close();
    setState("idle");
  }, []);

  return {
    code,
    pairUrl,
    state,
    isLive: state === "connected",
    showPairUI: state === "idle" || state === "reconnecting" || state === "waiting",
    lastError,
    regenerateCode,
    disconnect,
  };
}

function handleMsg(msg: CastMsg, opts: UseCastHostOptions) {
  if (msg.t === "bye") return;
  if (msg.t === "cam") {
    const jpeg = decodeCamB64(msg.b64);
    if (jpeg) opts.onCamFrame?.({ jpeg, receivedAt: Date.now() });
    return;
  }
  const input: RemoteInput = {};
  if (msg.t === "splats") input.splats = msg.s;
  if (msg.t === "ptr") input.ptr = { x: msg.x, y: msg.y, down: msg.down };
  if (msg.t === "gyro")
    input.gyro = { alpha: msg.alpha, beta: msg.beta, gamma: msg.gamma, angle: msg.ang };
  if (msg.t === "mic") input.mic = { level: msg.level, bands: msg.bands };
  if (msg.t === "world") input.worldId = msg.id;
  if (msg.t === "feel") input.feel = msg;
  if (Object.keys(input).length) opts.onRemoteInput?.(input);
}
