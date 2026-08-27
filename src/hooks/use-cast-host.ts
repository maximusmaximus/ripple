/**
 * Wall host — QR pair, then receive pad pointer / gyro / mic / camera / world / studio.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
import type { StudioSnapshot } from "@/lib/ripple/studio";
import { isLanPeer } from "@/lib/ripple/record";

export type HostConnectionState = "idle" | "waiting" | "connected" | "reconnecting";

export type RemoteInput = {
  splats?: Splat[];
  ptr?: { x: number; y: number; down: boolean };
  gyro?: { alpha: number; beta: number; gamma: number; angle?: 0 | 90 | 180 | 270 };
  mic?: { level: number; bands?: number[] };
  worldId?: PaletteId | string;
  feel?: { viscosity: number; waveStrength: number; brushDiameter: number };
  snapshot?: StudioSnapshot;
  clear?: boolean;
};

export type RemoteFrame = { jpeg: ArrayBuffer; receivedAt: number };

export type UseCastHostOptions = {
  preferredCode?: string | null;
  onCamFrame?: (frame: RemoteFrame) => void;
  onRemoteInput?: (input: RemoteInput) => void;
  /** Stay on this page when minting a new code (desktop overlay). */
  stayOnPage?: boolean;
  enabled?: boolean;
  onRecToggle?: (on: boolean) => void;
};

function makePeerId(prefix: string) {
  return `${prefix}${Math.random().toString(36).slice(2, 10)}`;
}

function pairUrlFor(code: string): string {
  if (typeof window === "undefined" || !code) return "";
  const u = new URL(window.location.href);
  u.search = "";
  u.searchParams.set("mode", "pad");
  u.searchParams.set("c", code);
  return u.toString();
}

export function useCastHost(opts: UseCastHostOptions = {}) {
  const [code, setCode] = useState(() => (opts.preferredCode || "").toUpperCase());
  const [state, setState] = useState<HostConnectionState>("idle");
  const [pairUrl, setPairUrl] = useState("");
  const [lastError, setLastError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [lanHd, setLanHd] = useState(false);
  const p2pRef = useRef<P2PRoom | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const wasLive = useRef(false);
  const namesRef = useRef(new Map<string, string>());

  useLayoutEffect(() => {
    const next = code || makeCastCode();
    if (!code) setCode(next);
    setPairUrl(pairUrlFor(next));
  }, [code]);

  useEffect(() => {
    if (!code) return;
    if (opts.enabled === false) return;
    const selfId = makePeerId("w");
    let lastLanSent = false;
    const p2p = new P2PRoom({
      room: roomIdFor(code),
      selfId,
      name: "wall",
      onPeersChanged: (peers) => {
        namesRef.current = new Map(peers.map((p) => [p.id, p.name]));
        const watches = peers.filter((p) => p.name === "watch" && p.connectionState === "connected");
        setViewerCount(watches.length);
        const pads = peers.filter(
          (p) => p.name !== "watch" && p.name !== "wall" && p.connectionState === "connected",
        );
        const waiting = peers.some(
          (p) =>
            p.name !== "watch" &&
            (p.connectionState === "connecting" || p.connectionState === "new"),
        );
        const live = pads.length > 0;
        const nextLan = live && pads.some((p) => isLanPeer(p));
        setLanHd(nextLan);
        if (nextLan !== lastLanSent) {
          lastLanSent = nextLan;
          try {
            p2p.send({ t: "lan-hd", on: nextLan } satisfies CastMsg);
          } catch {
            /* ignore */
          }
        }
        if (live) {
          wasLive.current = true;
          setState("connected");
          setLastError(null);
        } else if (wasLive.current) {
          wasLive.current = false;
          setState("reconnecting");
          setLastError("Phone dropped — scan again to take over");
        } else if (waiting) {
          setState((prev) => (prev === "reconnecting" ? prev : "waiting"));
        } else {
          setState((prev) => (prev === "reconnecting" ? prev : "idle"));
        }
      },
      onMessage: (from, data) => {
        const msg = parseCastMsg(data);
        if (!msg) return;
        const fromName = namesRef.current.get(from) ?? "";
        if (msg.t === "bye") {
          if (fromName === "watch") return;
          wasLive.current = false;
          setState("reconnecting");
          setLastError("Phone dropped — scan again to take over");
          return;
        }
        if (fromName === "watch" && msg.t !== "hello") return;
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
  }, [code, opts.enabled]);

  const regenerateCode = useCallback(() => {
    if (typeof window === "undefined") return;
    const next = makeCastCode();
    if (optsRef.current.stayOnPage) {
      wasLive.current = false;
      setLastError(null);
      setState("idle");
      setLanHd(false);
      setCode(next);
      setPairUrl(pairUrlFor(next));
      return;
    }
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
    wasLive.current = false;
    p2pRef.current?.close();
    setState("idle");
    setLanHd(false);
  }, []);

  const send = useCallback((msg: CastMsg) => {
    try {
      p2pRef.current?.send(msg);
    } catch {
      /* ignore */
    }
  }, []);

  const broadcast = useCallback((msg: CastMsg) => {
    try {
      p2pRef.current?.broadcast(msg);
    } catch {
      /* ignore */
    }
  }, []);

  return {
    code,
    pairUrl,
    state,
    isLive: state === "connected",
    showPairUI: state === "idle" || state === "reconnecting" || state === "waiting",
    lastError,
    viewerCount,
    lanHd,
    regenerateCode,
    disconnect,
    send,
    broadcast,
  };
}

function handleMsg(msg: CastMsg, opts: UseCastHostOptions) {
  if (msg.t === "bye") return;
  if (msg.t === "rec") {
    opts.onRecToggle?.(msg.on);
    return;
  }
  if (msg.t === "cam") {
    const jpeg = decodeCamB64(msg.b64);
    if (jpeg) opts.onCamFrame?.({ jpeg, receivedAt: Date.now() });
    return;
  }
  const input: RemoteInput = {};
  if (msg.t === "splats") input.splats = msg.s;
  if (msg.t === "ptr") input.ptr = { x: msg.x, y: msg.y, down: msg.down };
  if (msg.t === "gyro") input.gyro = { alpha: msg.alpha, beta: msg.beta, gamma: msg.gamma, angle: msg.ang };
  if (msg.t === "mic") input.mic = { level: msg.level, bands: msg.bands };
  if (msg.t === "world") input.worldId = msg.id;
  if (msg.t === "feel") input.feel = msg;
  if (msg.t === "studio" && msg.snap && typeof msg.snap === "object") input.snapshot = msg.snap;
  if (msg.t === "clear") input.clear = true;
  if (Object.keys(input).length) opts.onRemoteInput?.(input);
}