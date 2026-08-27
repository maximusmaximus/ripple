import { useCallback, useEffect, useRef, useState } from "react";

export type LiveInfo = {
  code: string;
  viewers: number;
  pads: number;
  hostPeer: string;
};

export type LiveRole = "host" | "watch" | "pad";

const HEARTBEAT_MS = 3000;

function makePeerId(prefix: string) {
  return `${prefix}${Math.random().toString(36).slice(2, 10)}`;
}

export function useLivePresence(opts: {
  role: LiveRole | null;
  code?: string | null;
  enabled?: boolean;
}) {
  const [session, setSession] = useState<LiveInfo | null>(null);
  const [ready, setReady] = useState(false);
  const [occupied, setOccupied] = useState(false);
  const peerRef = useRef(makePeerId(opts.role === "watch" ? "v" : opts.role === "pad" ? "p" : "h"));
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const leaveGenRef = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(new URL("/api/live", window.location.origin), { cache: "no-store" });
      if (!r.ok) {
        setReady(true);
        return;
      }
      const body = (await r.json()) as { session?: LiveInfo | null };
      setSession(body.session ?? null);
    } catch {
      /* offline roster */
    } finally {
      setReady(true);
    }
  }, []);

  const beat = useCallback(async () => {
    const { role, code, enabled } = optsRef.current;
    if (enabled === false || !role || !code) {
      await refresh();
      return;
    }
    try {
      const r = await fetch("/api/live", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "join", peer: peerRef.current, role, code: code.toUpperCase() }),
      });
      const body = (await r.json()) as { ok?: boolean; occupied?: boolean; session?: LiveInfo | null };
      setOccupied(Boolean(body.occupied));
      if (body.session !== undefined) setSession(body.session);
      else await refresh();
    } catch {
      await refresh();
    } finally {
      setReady(true);
    }
  }, [refresh]);

  useEffect(() => {
    void beat();
    const ms = opts.role ? HEARTBEAT_MS : 1000;
    const id = window.setInterval(() => void beat(), ms);
    return () => window.clearInterval(id);
  }, [beat, opts.role, opts.code, opts.enabled]);

  // Defer leave so React Strict Mode's effect cycle (run → cleanup → run)
  // cannot delete a join that just landed.
  useEffect(() => {
    const role = opts.role;
    const peer = peerRef.current;
    if (!role) return;
    const gen = ++leaveGenRef.current;
    return () => {
      window.setTimeout(() => {
        if (leaveGenRef.current !== gen) return;
        void fetch("/api/live", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ op: "leave", peer }),
          keepalive: true,
        }).catch(() => {});
      }, 150);
    };
  }, [opts.role]);

  return { session, ready, occupied, peerId: peerRef.current, refresh };
}
