import { useCallback, useEffect, useRef, useState } from "react";
import { P2PRoom } from "@/lib/multiplayer";
import { decodeCamB64, parseCastMsg, roomIdFor } from "@/lib/ripple/cast";
import type { RemoteFrame } from "./use-cast-host";

export type WatchState = "idle" | "connecting" | "live" | "ended";

function makePeerId() {
  return `v${Math.random().toString(36).slice(2, 10)}`;
}

export function useCastWatch(code: string) {
  const [state, setState] = useState<WatchState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [frame, setFrame] = useState<RemoteFrame | null>(null);
  const [viewers, setViewers] = useState(0);
  const p2pRef = useRef<P2PRoom | null>(null);

  useEffect(() => {
    if (!code) return;
    setState("connecting");
    setError(null);
    const p2p = new P2PRoom({
      room: roomIdFor(code),
      selfId: makePeerId(),
      name: "watch",
      onPeersChanged: (peers) => {
        const host = peers.some((p) => p.connectionState === "connected" && p.name === "wall");
        const watching = peers.filter((p) => p.name === "watch" && p.connectionState === "connected").length;
        setViewers(watching);
        if (host) setState("live");
        else if (p2pRef.current) {
          setState((prev) => (prev === "live" ? "ended" : prev));
        }
      },
      onMessage: (_from, data) => {
        const msg = parseCastMsg(data);
        if (!msg) return;
        if (msg.t === "bye") {
          setState("ended");
          return;
        }
        if (msg.t === "view" || msg.t === "cam") {
          const jpeg = decodeCamB64(msg.b64);
          if (jpeg) setFrame({ jpeg, receivedAt: Date.now() });
        }
      },
    });
    p2pRef.current = p2p;
    void p2p.join().then(() => {
      try {
        p2p.send({ t: "hello", role: "watch", code });
      } catch {
        /* channel may still be opening */
      }
    });
    return () => {
      try {
        p2p.send({ t: "bye" });
      } catch {
        /* ignore */
      }
      p2p.close();
      p2pRef.current = null;
    };
  }, [code]);

  const leave = useCallback(() => {
    try {
      p2pRef.current?.send({ t: "bye" });
    } catch {
      /* ignore */
    }
    p2pRef.current?.close();
    p2pRef.current = null;
    setState("ended");
  }, []);

  return {
    state,
    error,
    frame,
    viewers,
    isLive: state === "live",
    leave,
  };
}
