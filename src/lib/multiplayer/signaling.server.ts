/**
 * WebRTC signaling. Postgres (Neon) when DATABASE_URL is set so serverless
 * instances share a roster; in-memory otherwise (live preview / vite preview)
 * so we never boot PGLite inside the Vercel output bundle.
 */
import { z } from "zod";
import type { PeerRow, RtcPollResponse, SignalRow } from "./p2p";

const ID = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const signalSchema = z.object({
  op: z.literal("signal"),
  room: ID,
  from: ID,
  to: ID,
  kind: z.enum(["offer", "answer", "ice", "data"]),
  payload: z.unknown().refine((v) => v !== undefined && JSON.stringify(v).length <= 32_768, {
    message: "payload too large",
  }),
});
const leaveSchema = z.object({ op: z.literal("leave"), room: ID, peer: ID });
const postSchema = z.discriminatedUnion("op", [signalSchema, leaveSchema]);

const PEER_TTL_MS = 30_000;
const SIGNAL_TTL_MS = 60_000;

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

type MemPeer = { id: string; name: string; lastSeen: number };
type MemSignal = { id: number; from: string; to: string; kind: SignalRow["kind"]; payload: unknown; at: number };
type MemRoom = {
  peers: Map<string, MemPeer>;
  signals: MemSignal[];
  nextId: number;
  waiters: Array<() => void>;
};

const mem = globalThis as typeof globalThis & { __rtcMem__?: Map<string, MemRoom> };
function rooms() {
  mem.__rtcMem__ ??= new Map();
  return mem.__rtcMem__;
}

function roomOf(id: string): MemRoom {
  const map = rooms();
  let r = map.get(id);
  if (!r) {
    r = { peers: new Map(), signals: [], nextId: 1, waiters: [] };
    map.set(id, r);
  }
  r.waiters ??= [];
  return r;
}

function wakeRoom(r: MemRoom) {
  const waiting = r.waiters.splice(0);
  for (const wake of waiting) {
    try {
      wake();
    } catch {
      /* ignore */
    }
  }
}

function snapshot(r: MemRoom, peer: string, since: number): RtcPollResponse {
  return {
    peers: [...r.peers.values()].slice(0, 32).map((p) => ({ id: p.id, name: p.name })),
    signals: takeInbox(r, peer, since),
  };
}

function pruneMem(r: MemRoom, now: number) {
  for (const [id, p] of r.peers) {
    if (now - p.lastSeen > PEER_TTL_MS) r.peers.delete(id);
  }
  r.signals = r.signals.filter((s) => now - s.at < SIGNAL_TTL_MS);
}

function takeInbox(r: MemRoom, peer: string, since: number): SignalRow[] {
  const inbox = r.signals.filter((s) => s.to === peer && s.id > since);
  const handshake = inbox.filter((s) => s.kind !== "data");
  const data = inbox.filter((s) => s.kind === "data").slice(-80);
  return [...handshake, ...data]
    .sort((a, b) => a.id - b.id)
    .map((s) => ({ id: s.id, from: s.from, kind: s.kind, payload: s.payload }));
}

async function handleMemoryGet(url: URL): Promise<Response> {
  const parsed = z
    .object({
      room: ID,
      peer: ID,
      name: z.string().max(64).default(""),
      since: z.coerce.number().int().min(0).default(0),
      hold: z.enum(["0", "1"]).optional(),
      seen: z.string().max(512).optional(),
    })
    .safeParse({
      room: url.searchParams.get("room"),
      peer: url.searchParams.get("peer"),
      name: url.searchParams.get("name") ?? "",
      since: url.searchParams.get("since") ?? 0,
      hold: url.searchParams.get("hold") ?? undefined,
      seen: url.searchParams.get("seen") ?? undefined,
    });
  if (!parsed.success) return json({ error: "invalid query" }, 400);
  const { room, peer, name, since, hold, seen } = parsed.data;
  const now = Date.now();
  const r = roomOf(room);
  pruneMem(r, now);
  const isNew = !r.peers.has(peer);
  r.peers.set(peer, { id: peer, name, lastSeen: now });
  if (isNew) wakeRoom(r);
  let body = snapshot(r, peer, since);
  const known = (seen ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .sort()
    .join(",");
  const others = body.peers
    .filter((p) => p.id !== peer)
    .map((p) => p.id)
    .sort()
    .join(",");
  const rosterChanged = others !== known;
  if (hold === "1" && body.signals.length === 0 && !isNew && !rosterChanged) {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => resolve(), 2000);
      r.waiters.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
    pruneMem(r, Date.now());
    r.peers.set(peer, { id: peer, name, lastSeen: Date.now() });
    body = snapshot(r, peer, since);
  }
  return json(body);
}

function handleMemoryPost(msg: z.infer<typeof postSchema>): Response {
  const now = Date.now();
  if (msg.op === "signal") {
    const r = roomOf(msg.room);
    pruneMem(r, now);
    r.signals.push({
      id: r.nextId++,
      from: msg.from,
      to: msg.to,
      kind: msg.kind,
      payload: msg.payload,
      at: now,
    });
    wakeRoom(r);
  } else {
    const r = rooms().get(msg.room);
    r?.peers.delete(msg.peer);
    if (r) wakeRoom(r);
  }
  return json({ ok: true });
}

export async function handleSignaling(request: Request): Promise<Response> {
  try {
    if (hasDatabaseUrl()) {
      const { handleDbSignaling } = await import("./signaling-db.server");
      return handleDbSignaling(request);
    }
    if (request.method === "GET") return await handleMemoryGet(new URL(request.url));
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
    console.error("[rtc] signaling error:", error);
    return json({ error: "signaling failed" }, 500);
  }
}
