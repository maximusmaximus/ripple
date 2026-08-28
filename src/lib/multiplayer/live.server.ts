/**
 * Public LIVE session roster. One watchable host at a time; watchers and pads heartbeat in.
 * Postgres when DATABASE_URL is set; in-memory otherwise.
 */
import { z } from "zod";
import type { LiveInfo } from "./live-types";
import { isPublicLive } from "./live-types";
import { persistLiveListing } from "@/lib/ripple/github-live";

export type { LiveInfo } from "./live-types";

const ID = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const ROLE = z.enum(["host", "watch", "pad"]);
const CODE = z.string().regex(/^[A-Z0-9]{4,8}$/i);
const TITLE = z.string().max(48);
const DESC = z.string().max(140);

const joinSchema = z.object({
  op: z.literal("join"),
  peer: ID,
  role: ROLE,
  code: CODE,
});
const leaveSchema = z.object({ op: z.literal("leave"), peer: ID });
const metaSchema = z.object({
  op: z.literal("meta"),
  peer: ID,
  title: TITLE,
  description: DESC,
  watchable: z.boolean(),
});
const postSchema = z.discriminatedUnion("op", [joinSchema, leaveSchema, metaSchema]);

const PEER_TTL_MS = 10_000;

type MemPeer = {
  id: string;
  role: "host" | "watch" | "pad";
  code: string;
  lastSeen: number;
  title: string;
  description: string;
  watchable: boolean;
};

const mem = globalThis as typeof globalThis & { __liveMem__?: Map<string, MemPeer> };
function roster() {
  mem.__liveMem__ ??= new Map();
  return mem.__liveMem__;
}

function persistPublic(host: { code: string; title: string; description: string; watchable: boolean }) {
  const listing = isPublicLive({
    code: host.code,
    viewers: 0,
    pads: 0,
    hostPeer: "",
    title: host.title,
    description: host.description,
    watchable: host.watchable,
  })
    ? {
        code: host.code.toUpperCase(),
        title: host.title.trim(),
        description: host.description.trim(),
        watchable: true,
        watchUrl: `/?mode=watch&c=${host.code.toUpperCase()}`,
        updatedAt: new Date().toISOString(),
      }
    : null;
  void persistLiveListing(listing).catch(() => {});
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function hasDatabaseUrl() {
  const raw = typeof process !== "undefined" ? process.env.DATABASE_URL : undefined;
  return Boolean(raw && raw.trim());
}

function prune(now: number) {
  const map = roster();
  for (const [id, p] of map) {
    if (now - p.lastSeen > PEER_TTL_MS) map.delete(id);
  }
}

function hostOf(code?: string): MemPeer | undefined {
  const hosts = [...roster().values()].filter((p) => p.role === "host");
  if (code) return hosts.find((p) => p.code.toUpperCase() === code.toUpperCase());
  return hosts.find((p) => p.watchable && p.title.trim() && p.description.trim()) ?? hosts[0];
}

function snapshot(publicOnly = true): LiveInfo | null {
  const now = Date.now();
  prune(now);
  const host = hostOf();
  if (!host) return null;
  let viewers = 0;
  let pads = 0;
  for (const p of roster().values()) {
    if (p.code.toUpperCase() !== host.code.toUpperCase()) continue;
    if (p.role === "watch") viewers += 1;
    if (p.role === "pad") pads += 1;
  }
  const info: LiveInfo = {
    code: host.code.toUpperCase(),
    viewers,
    pads,
    hostPeer: host.id,
    title: host.title,
    description: host.description,
    watchable: host.watchable,
  };
  if (publicOnly && !isPublicLive(info)) return null;
  return info;
}

function snapshotForHost(peerId: string): LiveInfo | null {
  const host = roster().get(peerId);
  if (!host || host.role !== "host") return snapshot(false);
  let viewers = 0;
  let pads = 0;
  for (const p of roster().values()) {
    if (p.code.toUpperCase() !== host.code.toUpperCase()) continue;
    if (p.role === "watch") viewers += 1;
    if (p.role === "pad") pads += 1;
  }
  return {
    code: host.code.toUpperCase(),
    viewers,
    pads,
    hostPeer: host.id,
    title: host.title,
    description: host.description,
    watchable: host.watchable,
  };
}

function handleMemoryGet(): Response {
  return json({ session: snapshot(true) });
}

function handleMemoryPost(msg: z.infer<typeof postSchema>): Response {
  const now = Date.now();
  prune(now);
  const map = roster();
  if (msg.op === "leave") {
    const leaving = map.get(msg.peer);
    map.delete(msg.peer);
    if (leaving?.role === "host") persistPublic({ ...leaving, watchable: false });
    return json({ ok: true, session: snapshot(true) });
  }
  if (msg.op === "meta") {
    const peer = map.get(msg.peer);
    if (!peer || peer.role !== "host") {
      return json({ ok: false, reason: "not-host" }, 403);
    }
    peer.title = msg.title.trim();
    peer.description = msg.description.trim();
    peer.watchable = msg.watchable && Boolean(peer.title && peer.description);
    peer.lastSeen = now;
    map.set(msg.peer, peer);
    if (peer.watchable) {
      const other = [...map.values()].find(
        (p) => p.role === "host" && p.id !== peer.id && p.watchable && isPublicLive({
          code: p.code,
          viewers: 0,
          pads: 0,
          hostPeer: p.id,
          title: p.title,
          description: p.description,
          watchable: p.watchable,
        }),
      );
      if (other) {
        peer.watchable = false;
        map.set(msg.peer, peer);
        persistPublic(peer);
        return json({ ok: false, occupied: true, session: snapshot(true) });
      }
    }
    persistPublic(peer);
    return json({ ok: true, session: snapshotForHost(msg.peer) });
  }
  const code = msg.code.toUpperCase();
  if (msg.role === "host") {
    const existing = map.get(msg.peer);
    map.set(msg.peer, {
      id: msg.peer,
      role: "host",
      code,
      lastSeen: now,
      title: existing?.title ?? "",
      description: existing?.description ?? "",
      watchable: existing?.watchable ?? false,
    });
    return json({ ok: true, session: snapshotForHost(msg.peer) });
  }
  const host = hostOf(code);
  if (!host || host.code.toUpperCase() !== code) {
    return json({ ok: false, reason: "no-session", session: snapshot(true) });
  }
  if (msg.role === "watch" && !isPublicLive({
    code: host.code,
    viewers: 0,
    pads: 0,
    hostPeer: host.id,
    title: host.title,
    description: host.description,
    watchable: host.watchable,
  })) {
    return json({ ok: false, reason: "not-watchable", session: snapshot(true) });
  }
  map.set(msg.peer, {
    id: msg.peer,
    role: msg.role,
    code,
    lastSeen: now,
    title: "",
    description: "",
    watchable: false,
  });
  return json({ ok: true, session: snapshot(true) });
}

export async function handleLive(request: Request): Promise<Response> {
  try {
    if (hasDatabaseUrl()) {
      const { handleDbLive } = await import("./live-db.server");
      return handleDbLive(request);
    }
    if (request.method === "GET") return handleMemoryGet();
    if (request.method !== "POST") return json({ error: "method not allowed" }, 405);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid JSON" }, 400);
    }
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) return json({ error: "invalid request" }, 400);
    return handleMemoryPost(parsed.data);
  } catch (error) {
    console.error("[live] roster error:", error);
    return json({ error: "live roster failed" }, 500);
  }
}

export const livePostSchema = postSchema;
