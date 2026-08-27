import { z } from "zod";
import { getSql, type Sql } from "@/lib/db";
import { livePostSchema, type LiveInfo } from "./live.server";

const PEER_TTL_SECONDS = 10;

const globalRef = globalThis as typeof globalThis & {
  __liveSchemaPromise__?: Promise<void>;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function ensureSchema(sql: Sql): Promise<void> {
  globalRef.__liveSchemaPromise__ ??= (async () => {
    await sql.query(
      `CREATE TABLE IF NOT EXISTS live_roster (
         peer_id TEXT PRIMARY KEY,
         role TEXT NOT NULL,
         code TEXT NOT NULL,
         last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
       )`,
    );
  })().catch((err) => {
    globalRef.__liveSchemaPromise__ = undefined;
    throw err;
  });
  return globalRef.__liveSchemaPromise__;
}

async function prune(sql: Sql) {
  await sql.query(`DELETE FROM live_roster WHERE last_seen < now() - make_interval(secs => $1)`, [
    PEER_TTL_SECONDS,
  ]);
}

async function snapshot(sql: Sql): Promise<LiveInfo | null> {
  await prune(sql);
  const hosts = await sql.query<{ peer_id: string; code: string }>(
    `SELECT peer_id, code FROM live_roster WHERE role = 'host' ORDER BY last_seen DESC LIMIT 1`,
  );
  const host = hosts[0];
  if (!host) return null;
  const counts = await sql.query<{ role: string; n: string | number }>(
    `SELECT role, count(*)::int AS n FROM live_roster WHERE upper(code) = upper($1) GROUP BY role`,
    [host.code],
  );
  let viewers = 0;
  let pads = 0;
  for (const row of counts) {
    const n = Number(row.n);
    if (row.role === "watch") viewers = n;
    if (row.role === "pad") pads = n;
  }
  return { code: host.code.toUpperCase(), viewers, pads, hostPeer: host.peer_id };
}

export async function handleDbLive(request: Request): Promise<Response> {
  const sql = await getSql();
  await ensureSchema(sql);
  if (request.method === "GET") {
    return json({ session: await snapshot(sql) });
  }
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  const parsed = livePostSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid request" }, 400);
  const msg = parsed.data;
  if (msg.op === "leave") {
    await sql.query(`DELETE FROM live_roster WHERE peer_id = $1`, [msg.peer]);
    return json({ ok: true, session: await snapshot(sql) });
  }
  const code = msg.code.toUpperCase();
  if (msg.role === "host") {
    const hosts = await sql.query<{ peer_id: string }>(
      `SELECT peer_id FROM live_roster
       WHERE role = 'host' AND last_seen > now() - make_interval(secs => $1)
       LIMIT 1`,
      [PEER_TTL_SECONDS],
    );
    const existing = hosts[0];
    if (existing && existing.peer_id !== msg.peer) {
      return json({ ok: false, occupied: true, session: await snapshot(sql) });
    }
    await sql.query(
      `INSERT INTO live_roster (peer_id, role, code, last_seen)
       VALUES ($1, 'host', $2, now())
       ON CONFLICT (peer_id) DO UPDATE SET role = 'host', code = EXCLUDED.code, last_seen = now()`,
      [msg.peer, code],
    );
    return json({ ok: true, session: await snapshot(sql) });
  }
  const live = await snapshot(sql);
  if (!live || live.code !== code) {
    return json({ ok: false, reason: "no-session", session: live });
  }
  await sql.query(
    `INSERT INTO live_roster (peer_id, role, code, last_seen)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (peer_id) DO UPDATE SET role = EXCLUDED.role, code = EXCLUDED.code, last_seen = now()`,
    [msg.peer, msg.role, code],
  );
  return json({ ok: true, session: await snapshot(sql) });
}
