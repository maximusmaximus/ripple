/**
 * Public LIVE session roster. One host at a time; watchers and pads heartbeat in.
 * Postgres when DATABASE_URL is set; in-memory otherwise.
 */
import { z } from "zod";

const ID = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const ROLE = z.enum(["host", "watch", "pad"]);
const CODE = z.string().regex(/^[A-Z0-9]{4,8}$/i);

const joinSchema = z.object({
  op: z.literal("join"),
  peer: ID,
  role: ROLE,
  code: CODE,
});
const leaveSchema = z.object({ op: z.literal("leave"), peer: ID });
const postSchema = z.discriminatedUnion("op", [joinSchema, leaveSchema]);

export type LiveInfo = {
  code: string;
  viewers: number;
  pads: number;
  hostPeer: string;
};

const PEER_TTL_MS = 10_000;

type MemPeer = { id: string; role: "host" | "watch" | "pad"; code: string; lastSeen: number };

const mem = globalThis as typeof globalThis & { __liveMem__?: Map<string, MemPeer> };
function roster() {
  mem.__liveMem__ ??= new Map();
  return mem.__liveMem__;
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

function snapshot(): LiveInfo | null {
  const now = Date.now();
  prune(now);
  const host = [...roster().values()].find((p) => p.role === "host");
  if (!host) return null;
  let viewers = 0;
  let pads = 0;
  for (const p of roster().values()) {
    if (p.code.toUpperCase() !== host.code.toUpperCase()) continue;
    if (p.role === "watch") viewers += 1;
    if (p.role === "pad") pads += 1;
  }
  return { code: host.code.toUpperCase(), viewers, pads, hostPeer: host.id };
}

function handleMemoryGet(): Response {
  return json({ session: snapshot() });
}

function handleMemoryPost(msg: z.infer<typeof postSchema>): Response {
  const now = Date.now();
  prune(now);
  const map = roster();
  if (msg.op === "leave") {
    map.delete(msg.peer);
    return json({ ok: true, session: snapshot() });
  }
  const code = msg.code.toUpperCase();
  if (msg.role === "host") {
    const existing = [...map.values()].find((p) => p.role === "host");
    if (existing && existing.id !== msg.peer) {
      return json({ ok: false, occupied: true, session: snapshot() });
    }
    map.set(msg.peer, { id: msg.peer, role: "host", code, lastSeen: now });
    return json({ ok: true, session: snapshot() });
  }
  const host = [...map.values()].find((p) => p.role === "host");
  if (!host || host.code.toUpperCase() !== code) {
    return json({ ok: false, reason: "no-session", session: snapshot() });
  }
  map.set(msg.peer, { id: msg.peer, role: msg.role, code, lastSeen: now });
  return json({ ok: true, session: snapshot() });
}

export async function handleLive(request: Request): Promise<Response> {
  try {
    if (hasDatabaseUrl()) {
      const { handleDbLive } = await import("./live-db.server");
      return handleDbLive(request);
    }
    if (request.method === "GET") return handleMemoryGet();
    if (request.method === "POST") {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json({ error: "invalid JSON" }, 400);
      }
      const parsed = postSchema.safeParse(body);
      if (!parsed.success) return json({ error: "invalid request" }, 400);
      return handleMemoryPost(parsed.data);
    }
    return json({ error: "method not allowed" }, 405);
  } catch (error) {
    console.error("[live] roster error:", error);
    return json({ error: "live roster failed" }, 500);
  }
}

export const livePostSchema = postSchema;
