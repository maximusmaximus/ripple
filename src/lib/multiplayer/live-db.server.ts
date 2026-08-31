import { getSql, type Sql } from "@/lib/db";
import { livePostSchema, type LiveInfo } from "./live.server";
import { isPublicLive } from "./live-types";
import { persistLiveListing } from "@/lib/ripple/github-live";

const PEER_TTL_SECONDS = 10;
const HOST_TTL_SECONDS = 120;

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
         last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
         title TEXT NOT NULL DEFAULT '',
         description TEXT NOT NULL DEFAULT '',
         watchable BOOLEAN NOT NULL DEFAULT false
       )`,
    );
    await sql.query(`ALTER TABLE live_roster ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT ''`);
    await sql.query(`ALTER TABLE live_roster ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''`);
    await sql.query(`ALTER TABLE live_roster ADD COLUMN IF NOT EXISTS watchable BOOLEAN NOT NULL DEFAULT false`);
  })().catch((err) => {
    globalRef.__liveSchemaPromise__ = undefined;
    throw err;
  });
  return globalRef.__liveSchemaPromise__;
}

function persistFromInfo(info: LiveInfo | null) {
  if (!info || !isPublicLive(info)) {
    void persistLiveListing(null).catch(() => {});
    return;
  }
  void persistLiveListing({
    code: info.code,
    title: info.title.trim(),
    description: info.description.trim(),
    watchable: true,
    watchUrl: `/?mode=watch&c=${info.code}`,
    updatedAt: new Date().toISOString(),
  }).catch(() => {});
}

async function prune(sql: Sql) {
  await sql.query(
    `DELETE FROM live_roster WHERE
       (role = 'host' AND last_seen < now() - make_interval(secs => $1))
       OR (role <> 'host' AND last_seen < now() - make_interval(secs => $2))`,
    [HOST_TTL_SECONDS, PEER_TTL_SECONDS],
  );
}

async function countsFor(sql: Sql, code: string): Promise<{ viewers: number; pads: number }> {
  const counts = await sql.query<{ role: string; n: string | number }>(
    `SELECT role, count(*)::int AS n FROM live_roster WHERE upper(code) = upper($1) GROUP BY role`,
    [code],
  );
  let viewers = 0;
  let pads = 0;
  for (const row of counts) {
    const n = Number(row.n);
    if (row.role === "watch") viewers = n;
    if (row.role === "pad") pads = n;
  }
  return { viewers, pads };
}

async function snapshot(sql: Sql, publicOnly = true, hostPeer?: string): Promise<LiveInfo | null> {
  await prune(sql);
  const hosts = hostPeer
    ? await sql.query<{ peer_id: string; code: string; title: string; description: string; watchable: boolean }>(
        `SELECT peer_id, code, title, description, watchable FROM live_roster WHERE peer_id = $1 AND role = 'host' LIMIT 1`,
        [hostPeer],
      )
    : await sql.query<{ peer_id: string; code: string; title: string; description: string; watchable: boolean }>(
        `SELECT peer_id, code, title, description, watchable FROM live_roster
         WHERE role = 'host'
         ORDER BY watchable DESC, last_seen DESC
         LIMIT 1`,
      );
  const host = hosts[0];
  if (!host) return null;
  const { viewers, pads } = await countsFor(sql, host.code);
  const info: LiveInfo = {
    code: host.code.toUpperCase(),
    viewers,
    pads,
    hostPeer: host.peer_id,
    title: host.title ?? "",
    description: host.description ?? "",
    watchable: Boolean(host.watchable),
  };
  if (publicOnly && !isPublicLive(info)) return null;
  return info;
}

export async function handleDbLive(request: Request): Promise<Response> {
  const sql = await getSql();
  await ensureSchema(sql);
  if (request.method === "GET") {
    return json({ session: await snapshot(sql, true) });
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
    const pub = await snapshot(sql, true);
    persistFromInfo(pub);
    return json({ ok: true, session: pub });
  }
  if (msg.op === "meta") {
    const rows = await sql.query<{ role: string }>(
      `SELECT role FROM live_roster WHERE peer_id = $1 LIMIT 1`,
      [msg.peer],
    );
    if (!rows[0] || rows[0].role !== "host") return json({ ok: false, reason: "not-host" }, 403);
    const title = msg.title.trim();
    const description = msg.description.trim();
    let watchable = msg.watchable && Boolean(title && description);
    if (watchable) {
      const others = await sql.query<{ peer_id: string }>(
        `SELECT peer_id FROM live_roster
         WHERE role = 'host' AND watchable = true AND peer_id <> $1
           AND length(trim(title)) > 0 AND length(trim(description)) > 0
           AND last_seen > now() - make_interval(secs => $2)
         LIMIT 1`,
        [msg.peer, PEER_TTL_SECONDS],
      );
      if (others[0]) watchable = false;
      if (others[0]) {
        await sql.query(
          `UPDATE live_roster SET title = $2, description = $3, watchable = false, last_seen = now() WHERE peer_id = $1`,
          [msg.peer, title, description],
        );
        return json({ ok: false, occupied: true, session: await snapshot(sql, true) });
      }
    }
    await sql.query(
      `UPDATE live_roster SET title = $2, description = $3, watchable = $4, last_seen = now() WHERE peer_id = $1`,
      [msg.peer, title, description, watchable],
    );
    const mine = await snapshot(sql, false, msg.peer);
    persistFromInfo(watchable ? mine : await snapshot(sql, true));
    return json({ ok: true, session: mine });
  }
  const code = msg.code.toUpperCase();
  if (msg.role === "host") {
    await sql.query(
      `INSERT INTO live_roster (peer_id, role, code, last_seen)
       VALUES ($1, 'host', $2, now())
       ON CONFLICT (peer_id) DO UPDATE SET role = 'host', code = EXCLUDED.code, last_seen = now()`,
      [msg.peer, code],
    );
    return json({ ok: true, session: await snapshot(sql, false, msg.peer) });
  }
  const live = await snapshot(sql, false);
  if (!live || live.code !== code) {
    return json({ ok: false, reason: "no-session", session: await snapshot(sql, true) });
  }
  if (msg.role === "watch" && !isPublicLive(live)) {
    return json({ ok: false, reason: "not-watchable", session: await snapshot(sql, true) });
  }
  await sql.query(
    `INSERT INTO live_roster (peer_id, role, code, last_seen)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (peer_id) DO UPDATE SET role = EXCLUDED.role, code = EXCLUDED.code, last_seen = now()`,
    [msg.peer, msg.role, code],
  );
  return json({ ok: true, session: await snapshot(sql, true) });
}
