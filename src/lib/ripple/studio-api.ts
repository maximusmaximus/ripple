import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { MAX_STUDIO_PRESETS, type NamedPreset, type StudioSnapshot } from "./studio";

const SESSION_ID = "live";

const snapshotSchema = z.object({
  worldId: z.string(),
  colorRanges: z.record(z.string(), z.unknown()).optional(),
  colorPairs: z.record(z.string(), z.unknown()).optional(),
  colorStops: z.record(z.string(), z.unknown()).optional(),
  viscosity: z.number(),
  waveStrength: z.number(),
  brushDiameter: z.number(),
  brushId: z.string(),
  brushFx: z.record(z.string(), z.unknown()).optional(),
  brushFxOpacity: z.number(),
  fxLayers: z.array(z.string()),
  shadowOn: z.boolean(),
  shadowColor: z.string(),
  shadowAngle: z.number(),
  shadowOpacity: z.number(),
  textureId: z.string(),
  textureFit: z.enum(["cover", "contain", "stretch"]),
  customTexture: z
    .object({
      mime: z.string(),
      dataUrl: z.string().max(1_600_000),
      width: z.number(),
      height: z.number(),
    })
    .nullable(),
  cameraInteract: z.number(),
  micSensitivity: z.number(),
  gyroSensitivity: z.number(),
});

async function writeHomebaseFile(preset: NamedPreset): Promise<void> {
  try {
    const { mkdir, readFile, writeFile } = await import("node:fs/promises");
    const path = await import("node:path");
    const dir = path.join(process.cwd(), "public/studio");
    const file = path.join(dir, "presets.json");
    await mkdir(dir, { recursive: true });
    let current: { version: number; note?: string; presets: NamedPreset[] } = {
      version: 1,
      presets: [],
    };
    try {
      current = JSON.parse(await readFile(file, "utf8")) as typeof current;
      if (!Array.isArray(current.presets)) current.presets = [];
    } catch {
      /* first write */
    }
    const slim: NamedPreset = { ...preset };
    const dataUrl = slim.snapshot.customTexture?.dataUrl;
    if (dataUrl && dataUrl.length > 240_000) {
      slim.snapshot = { ...slim.snapshot, customTexture: null, textureId: slim.snapshot.textureId === "custom" ? "none" : slim.snapshot.textureId };
    }
    const next = [slim, ...current.presets.filter((p) => p.id !== slim.id)].slice(0, MAX_STUDIO_PRESETS);
    await writeFile(
      file,
      JSON.stringify(
        {
          version: 1,
          note: "Homebase presets. Shipped with the repo and pulled from GitHub after restarts or updates.",
          presets: next,
        },
        null,
        2,
      ),
    );
  } catch {
    /* Vercel / read-only — database is the live store */
  }
}

export const getStudioSession = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{ payload: StudioSnapshot | string; updated_at: string }>`
    select payload, updated_at from studio_session where id = ${SESSION_ID} limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  const snapshot = typeof row.payload === "string" ? (JSON.parse(row.payload) as StudioSnapshot) : row.payload;
  return { snapshot, updatedAt: row.updated_at };
});

export const putStudioSession = createServerFn({ method: "POST" })
  .validator((data: unknown) => snapshotSchema.parse(data))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const payload = JSON.stringify(data);
    await sql.query(
      `insert into studio_session (id, payload, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
      [SESSION_ID, payload],
    );
    return { ok: true as const };
  });

export const listStudioPresets = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{ id: string; name: string; payload: StudioSnapshot; created_at: string }>`
    select id, name, payload, created_at from studio_presets order by created_at desc
  `;
  return rows.map((r): NamedPreset => {
    const snapshot = typeof r.payload === "string" ? (JSON.parse(r.payload) as StudioSnapshot) : r.payload;
    return {
      id: r.id,
      name: r.name,
      createdAt: r.created_at,
      snapshot,
      source: "studio",
    };
  });
});

const saveSchema = z.object({
  id: z.string().min(3).max(48),
  name: z.string().min(1).max(32),
  snapshot: snapshotSchema,
});

export const saveStudioPreset = createServerFn({ method: "POST" })
  .validator((data: unknown) => saveSchema.parse(data))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const countRows = await sql<{ n: number }>`select count(*)::int as n from studio_presets`;
    const n = countRows[0]?.n ?? 0;
    const exists = await sql<{ id: string }>`select id from studio_presets where id = ${data.id} limit 1`;
    if (n >= MAX_STUDIO_PRESETS && !exists[0]) {
      throw new Error(`Studio is full (${MAX_STUDIO_PRESETS} presets).`);
    }
    const payload = JSON.stringify(data.snapshot);
    await sql.query(
      `insert into studio_presets (id, name, payload, created_at, updated_at)
       values ($1, $2, $3::jsonb, now(), now())
       on conflict (id) do update set name = excluded.name, payload = excluded.payload, updated_at = now()`,
      [data.id, data.name, payload],
    );
    const preset: NamedPreset = {
      id: data.id,
      name: data.name,
      createdAt: new Date().toISOString(),
      snapshot: data.snapshot as StudioSnapshot,
      source: "studio",
    };
    await writeHomebaseFile(preset);
    return { ok: true as const, id: data.id };
  });
