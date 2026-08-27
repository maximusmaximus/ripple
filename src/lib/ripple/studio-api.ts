import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import {
  EASY_PRESET_ID,
  MAX_STUDIO_PRESETS,
  type CustomTexture,
  type NamedPreset,
  type StudioSnapshot,
} from "./studio";
import type { CustomBrush } from "./brushes";
import { isBuiltinPresetId, builtinNames, builtinPresets } from "./showroom";

const SESSION_ID = "live";
const MEDIA_DIR = "public/studio/media";
const PRESETS_FILE = "public/studio/presets.json";
const SESSION_FILE = "public/studio/session.json";

const mediaObject = z
  .object({
    mime: z.string(),
    dataUrl: z.string().max(15_000_000).optional().default(""),
    width: z.number(),
    height: z.number(),
    path: z.string().max(240).optional(),
  })
  .passthrough();

const snapshotSchema = z
  .object({
    worldId: z.string(),
    colorRanges: z.record(z.string(), z.unknown()).optional(),
    colorPairs: z.record(z.string(), z.unknown()).optional(),
    colorStops: z.record(z.string(), z.unknown()).optional(),
    viscosity: z.number(),
    waveStrength: z.number(),
    brushDiameter: z.number(),
    brushSpan: z
      .record(
        z.string(),
        z.object({
          min: z.number().optional(),
          max: z.number().optional(),
          start: z.number().optional(),
          mid: z.number().optional(),
          end: z.number().optional(),
        }),
      )
      .optional(),
    brushShape: z.record(z.string(), z.object({ angle: z.number(), width: z.number(), spin: z.number() })).optional(),
    brushId: z.string(),
    brushFx: z.record(z.string(), z.unknown()).optional(),
    brushFxOpacity: z.number(),
    fxLayers: z.array(z.string()),
    shadowOn: z.boolean(),
    shadowColor: z.string(),
    shadowAngle: z.number(),
    shadowOpacity: z.number(),
    shadowDist: z.number().optional(),
    shadowSpan: z.object({ start: z.number(), mid: z.number(), end: z.number() }).optional(),
    textureId: z.string(),
    textureFit: z.enum(["cover", "contain", "stretch"]),
    customTexture: mediaObject.nullable(),
    textureLevels: z.number().optional(),
    textureInvert: z.boolean().optional(),
    gradientFlip: z.boolean().optional(),
    cameraInteract: z.number(),
    micSensitivity: z.number(),
    gyroSensitivity: z.number(),
    gyroZoom: z.number().optional(),
    customBrushes: z
      .array(
        mediaObject.extend({
          id: z.string().min(3).max(48),
          name: z.string().min(1).max(24),
          mime: z.string(),
          angle: z.number(),
          spin: z.number(),
          markWidth: z.number().optional(),
        }),
      )
      .max(16)
      .optional(),
  })
  .passthrough();

function extFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "jpg";
}

function hasDataUrl(s?: string): boolean {
  return !!s && s.length > 16 && s.startsWith("data:");
}

async function writeDataUrlFile(fileName: string, dataUrl: string): Promise<string | null> {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  try {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const path = await import("node:path");
    const dir = path.join(process.cwd(), MEDIA_DIR);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, fileName), Buffer.from(m[2]!, "base64"));
    return `/studio/media/${fileName}`;
  } catch {
    return null;
  }
}

function stripDataUrl<T extends { dataUrl?: string; path?: string }>(item: T): T {
  if (!item.path) return item;
  return { ...item, dataUrl: "" };
}

export function stripMediaDataUrls(snap: StudioSnapshot): StudioSnapshot {
  return {
    ...snap,
    customTexture: snap.customTexture ? stripDataUrl(snap.customTexture) : null,
    customBrushes: (snap.customBrushes ?? []).map((b) => stripDataUrl(b)),
  };
}

const lastMediaSig = new Map<string, string>();

function mediaSig(snap: StudioSnapshot): string {
  const t = snap.customTexture;
  const brushes = snap.customBrushes ?? [];
  return `${t?.dataUrl?.length ?? 0}:${t?.width ?? 0}:${t?.path ?? ""}:${brushes.map((b) => `${b.id}:${b.dataUrl?.length ?? 0}:${b.path ?? ""}`).join(",")}`;
}

export async function persistSnapshotMedia(snap: StudioSnapshot, idHint: string): Promise<StudioSnapshot> {
  const safe = idHint.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || "mix";
  const sig = mediaSig(snap);
  const already = lastMediaSig.get(idHint) === sig;

  let customTexture: CustomTexture | null = snap.customTexture ?? null;
  if (customTexture && hasDataUrl(customTexture.dataUrl)) {
    const ext = extFromMime(customTexture.mime || "image/jpeg");
    const fileName = `${safe}_tex.${ext}`;
    const expected = `/studio/media/${fileName}`;
    if (!already) await writeDataUrlFile(fileName, customTexture.dataUrl);
    customTexture = { ...customTexture, path: customTexture.path || expected };
  }

  const customBrushes: CustomBrush[] = [];
  for (const b of snap.customBrushes ?? []) {
    if (hasDataUrl(b.dataUrl)) {
      const fileName = `${safe}_${b.id}.png`;
      const expected = `/studio/media/${fileName}`;
      if (!already) await writeDataUrlFile(fileName, b.dataUrl);
      customBrushes.push({ ...b, path: b.path || expected });
    } else {
      customBrushes.push(b);
    }
  }

  lastMediaSig.set(idHint, sig);
  return { ...snap, customTexture, customBrushes };
}

async function writeJsonFile(rel: string, data: unknown): Promise<void> {
  try {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const path = await import("node:path");
    const file = path.join(process.cwd(), rel);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(data, null, 2));
  } catch {
    /* Vercel / read-only */
  }
}

async function readJsonFile<T>(rel: string): Promise<T | null> {
  try {
    const { readFile } = await import("node:fs/promises");
    const path = await import("node:path");
    const raw = await readFile(path.join(process.cwd(), rel), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeHomebaseFile(preset: NamedPreset): Promise<void> {
  try {
    const stored = await persistSnapshotMedia(preset.snapshot, preset.id);
    const slim: NamedPreset = {
      ...preset,
      snapshot: stripMediaDataUrls(stored),
    };
    await mergeHomebase([slim]);
  } catch {
    /* Vercel / read-only — database is the live store */
  }
}

async function mergeHomebase(extra: NamedPreset[] = []): Promise<void> {
  const current =
    (await readJsonFile<{ version: number; note?: string; presets: NamedPreset[] }>(PRESETS_FILE)) ?? {
      version: 0,
      presets: [],
    };
  if (!Array.isArray(current.presets)) current.presets = [];
  const authored = builtinPresets();
  const authoredIds = new Set(authored.map((p) => p.id));
  const incoming = extra.filter((p) => !isBuiltinPresetId(p.id) && !authoredIds.has(p.id));
  if (extra.length === 0 && current.version >= 2 && current.presets.some((p) => p.id === EASY_PRESET_ID)) {
    return;
  }
  const users = [
    ...incoming,
    ...current.presets.filter(
      (p) => !isBuiltinPresetId(p.id) && !authoredIds.has(p.id) && !incoming.some((e) => e.id === p.id),
    ),
  ];
  const cap = Math.max(0, MAX_STUDIO_PRESETS - authored.length);
  await writeJsonFile(PRESETS_FILE, {
    version: 2,
    note: "Built-in presets plus studio saves. Images live in /studio/media.",
    presets: [...authored, ...users.slice(0, cap)],
  });
}

let lastSessionSig = "";

async function writeSessionFile(snap: StudioSnapshot): Promise<void> {
  const slim = stripMediaDataUrls(snap);
  const sig = JSON.stringify(slim);
  if (sig === lastSessionSig) return;
  lastSessionSig = sig;
  await writeJsonFile(SESSION_FILE, {
    version: 1,
    updatedAt: new Date().toISOString(),
    snapshot: slim,
  });
}

export const getStudioSession = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{ payload: StudioSnapshot | string; updated_at: string }>`
    select payload, updated_at from studio_session where id = ${SESSION_ID} limit 1
  `;
  const row = rows[0];
  if (row) {
    const snapshot = typeof row.payload === "string" ? (JSON.parse(row.payload) as StudioSnapshot) : row.payload;
    return { snapshot, updatedAt: row.updated_at };
  }
  const file = await readJsonFile<{ snapshot: StudioSnapshot; updatedAt?: string }>(SESSION_FILE);
  if (file?.snapshot) return { snapshot: file.snapshot, updatedAt: file.updatedAt ?? "" };
  return null;
});

export const putStudioSession = createServerFn({ method: "POST" })
  .validator((data: unknown) => snapshotSchema.parse(data))
  .handler(async ({ data }) => {
    const stored = await persistSnapshotMedia(data as StudioSnapshot, SESSION_ID);
    const sql = await getSql();
    const forDb: StudioSnapshot = {
      ...stored,
      customTexture:
        stored.customTexture && (stored.customTexture.dataUrl?.length ?? 0) > 1_500_000
          ? stripDataUrl(stored.customTexture)
          : stored.customTexture,
    };
    const payload = JSON.stringify(forDb);
    await sql.query(
      `insert into studio_session (id, payload, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
      [SESSION_ID, payload],
    );
    await writeSessionFile(stored);
    return { ok: true as const };
  });

export const listStudioPresets = createServerFn({ method: "GET" }).handler(async () => {
  await mergeHomebase().catch(() => {});
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
    const label = data.name.trim().toLowerCase();
    if (label === "easy" || builtinNames().some((n) => n.trim().toLowerCase() === label)) {
      throw new Error("That label is already in use — pick another.");
    }
    if (isBuiltinPresetId(data.id)) {
      throw new Error("Starter presets stay as they are.");
    }
    const taken = await sql<{ id: string }>`
      select id from studio_presets where lower(name) = ${label} limit 1
    `;
    if (taken[0] && taken[0].id !== data.id) {
      throw new Error("That label is already in use — pick another.");
    }
    const countRows = await sql<{ n: number }>`select count(*)::int as n from studio_presets`;
    const n = countRows[0]?.n ?? 0;
    const exists = await sql<{ id: string }>`select id from studio_presets where id = ${data.id} limit 1`;
    if (n >= MAX_STUDIO_PRESETS && !exists[0]) {
      throw new Error(`Studio is full (${MAX_STUDIO_PRESETS} presets).`);
    }
    const stored = await persistSnapshotMedia(data.snapshot as StudioSnapshot, data.id);
    const payload = JSON.stringify(stored);
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
      snapshot: stored,
      source: "studio",
    };
    await writeHomebaseFile(preset);
    await writeSessionFile(stored);
    return { ok: true as const, id: data.id };
  });

async function removeHomebasePreset(id: string): Promise<void> {
  if (isBuiltinPresetId(id)) return;
  try {
    const current = await readJsonFile<{ version: number; note?: string; presets: NamedPreset[] }>(PRESETS_FILE);
    if (!current || !Array.isArray(current.presets)) return;
    current.presets = current.presets.filter((p) => p.id !== id);
    await writeJsonFile(PRESETS_FILE, current);
  } catch {
    /* read-only */
  }
}

export const deleteStudioPreset = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string().min(3).max(48) }).parse(data))
  .handler(async ({ data }) => {
    if (data.id === EASY_PRESET_ID || isBuiltinPresetId(data.id)) {
      throw new Error("Starter presets stay as they are.");
    }
    const sql = await getSql();
    await sql.query(`delete from studio_presets where id = $1`, [data.id]);
    await removeHomebasePreset(data.id);
    return { ok: true as const };
  });

const feedbackSchema = z.object({
  kind: z.enum(["feature", "bug"]),
  body: z.string().min(8).max(2000),
});

export const submitStudioFeedback = createServerFn({ method: "POST" })
  .validator((data: unknown) => feedbackSchema.parse(data))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const id = `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const body = data.body.trim();
    await sql.query(
      `insert into studio_feedback (id, kind, body, created_at) values ($1, $2, $3, now())`,
      [id, data.kind, body],
    );
    const { openFeedbackIssue } = await import("./github-feedback");
    const opened = await openFeedbackIssue(data.kind, body).catch(() => ({ issue: null, error: "GitHub unavailable" }));
    return { ok: true as const, issue: opened.issue ?? null, githubError: opened.error ?? null };
  });
