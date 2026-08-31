import type { BrushId, BrushShape, BrushSpan, CustomBrush } from "@/lib/ripple/brushes";
import type { BrushFxId, FxLayerId } from "@/lib/ripple/blend";
import type { ColorPair, ColorStop, PaletteId } from "@/lib/ripple/palettes";
import type { TextureId } from "@/lib/ripple/textures";
import { expandShortcodes } from "@/lib/ripple/emoji";

export type TextureFit = "cover" | "contain" | "stretch";

export type CustomTexture = {
  mime: string;
  dataUrl: string;
  width: number;
  height: number;
  /** Repo-relative public path after persist (`/studio/media/...`). */
  path?: string;
};

export type { CustomBrush };

export type StudioSnapshot = {
  worldId: PaletteId;
  colorRanges: Partial<Record<PaletteId, { start: number; end: number }>>;
  colorPairs: Partial<Record<PaletteId, ColorPair>>;
  colorStops: Partial<Record<PaletteId, ColorStop[]>>;
  viscosity: number;
  waveStrength: number;
  brushDiameter: number;
  brushSpan?: Partial<Record<string, BrushSpan>>;
  brushShape?: Partial<Record<string, BrushShape>>;
  brushId: BrushId | string;
  brushFx: Partial<Record<string, BrushFxId | BrushFxId[]>>;
  brushFxOpacity: number;
  fxLayers: FxLayerId[];
  shadowOn: boolean;
  shadowColor: string;
  shadowAngle: number;
  shadowOpacity: number;
  shadowDist?: number;
  shadowSpan?: { start: number; mid: number; end: number };
  textureId: TextureId;
  textureFit: TextureFit;
  customTexture: CustomTexture | null;
  textureLevels?: number;
  textureInvert?: boolean;
  gradientFlip?: boolean;
  cameraInteract: number;
  /** 0–1. Opaque camera bed → transparent. Missing = 1 for old snapshots. */
  cameraOpacity?: number;
  micSensitivity: number;
  gyroSensitivity: number;
  gyroZoom?: number;
  customBrushes?: CustomBrush[];
};

export type NamedPreset = {
  id: string;
  name: string;
  createdAt: string;
  snapshot: StudioSnapshot;
  source: "homebase" | "studio";
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_DIM = 4096;
export const MAX_PRESET_NAME = 32;
export const MAX_STUDIO_PRESETS = 100;
export const ALLOWED_TEXTURE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
export const EASY_PRESET_ID = "home_easy";
export const GITHUB_HOMEBASE_URL =
  "https://raw.githubusercontent.com/maximusmaximus/ripple/main/public/studio/presets.json";

export const TEXTURE_FITS: { id: TextureFit; name: string; hint: string }[] = [
  { id: "cover", name: "Cover", hint: "Fill the frame — crop the overflow." },
  { id: "contain", name: "Contain", hint: "Fit inside — letterbox if needed." },
  { id: "stretch", name: "Stretch", hint: "Warp to the canvas." },
];

export function easySnapshot(): StudioSnapshot {
  return {
    worldId: "lens",
    colorRanges: {},
    colorPairs: {},
    colorStops: {},
    viscosity: 0.96,
    waveStrength: 0.7,
    brushDiameter: 0.04,
    brushSpan: { ink: { start: 0.04, mid: 0.028, end: 0.014 } },
    brushId: "ink",
    brushFx: { ink: ["normal"] },
    brushFxOpacity: 0.7,
    fxLayers: ["brush"],
    shadowOn: false,
    shadowColor: "#0a0810",
    shadowAngle: 135,
    shadowOpacity: 0.45,
    shadowDist: 0.35,
    shadowSpan: { start: 0.072, mid: 0.048, end: 0.022 },
    textureId: "none",
    textureFit: "cover",
    customTexture: null,
    textureLevels: 0,
    textureInvert: false,
    gradientFlip: false,
    cameraInteract: 0.85,
    cameraOpacity: 0.58,
    micSensitivity: 0.4,
    gyroSensitivity: 0.7,
    gyroZoom: 0.55,
    customBrushes: [],
  };
}

export function easyPreset(): NamedPreset {
  return {
    id: EASY_PRESET_ID,
    name: "Easy",
    createdAt: "2026-08-24T00:00:00.000Z",
    snapshot: easySnapshot(),
    source: "homebase",
  };
}

export function fitCode(fit: TextureFit | string | undefined): number {
  if (fit === "contain") return 1;
  if (fit === "stretch") return 2;
  return 0;
}

export function newPresetId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function sanitizePresetName(name: string): string {
  return expandShortcodes(name).replace(/\s+/g, " ").trim().slice(0, MAX_PRESET_NAME);
}

export function uniquePresetName(desired: string, taken: string[]): string {
  const root = sanitizePresetName(desired) || "Mix";
  const used = new Set(taken.map((n) => n.trim().toLowerCase()));
  if (!used.has(root.toLowerCase())) return root;
  for (let i = 2; i < 99; i++) {
    const next = sanitizePresetName(`${root} ${i}`);
    if (!used.has(next.toLowerCase())) return next;
  }
  return sanitizePresetName(`${root} ${Date.now().toString(36)}`);
}

export function presetWantsCamera(snap: StudioSnapshot): boolean {
  if ((snap.fxLayers ?? []).includes("camera")) return true;
  return (snap.cameraOpacity ?? 0) > 0.05;
}

export function mediaSrc(item?: { dataUrl?: string; path?: string } | null): string | null {
  if (!item) return null;
  const url = item.dataUrl ?? "";
  if (url.length > 16 && (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("http"))) return url;
  if (item.path) return item.path;
  if (url.length > 16) return url;
  return null;
}

export function hasMediaPayload(item?: { dataUrl?: string; path?: string } | null): boolean {
  return mediaSrc(item) != null;
}

function asPresets(data: unknown): NamedPreset[] {
  if (!data || typeof data !== "object") return [];
  const list = (data as { presets?: unknown }).presets;
  if (!Array.isArray(list)) return [];
  return list
    .filter((p): p is NamedPreset => !!p && typeof p === "object" && typeof (p as NamedPreset).id === "string")
    .map((p) => ({ ...p, source: "homebase" as const }));
}

async function fetchPresetList(url: string): Promise<NamedPreset[]> {
  try {
    const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(2500) });
    if (!r.ok) return [];
    return asPresets(await r.json());
  } catch {
    return [];
  }
}

/** Built-in catalog first, then local JSON. GitHub only if the local file is empty. */
export async function loadHomebasePresets(): Promise<NamedPreset[]> {
  const [{ builtinPresets }, local] = await Promise.all([
    import("@/lib/ripple/showroom"),
    fetchPresetList("/studio/presets.json"),
  ]);
  const seen = new Set<string>();
  const merged: NamedPreset[] = [];
  for (const p of [...builtinPresets(), ...local]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push(p);
  }
  if (local.length) return merged;
  const remote = await fetchPresetList(GITHUB_HOMEBASE_URL);
  for (const p of remote) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push(p);
  }
  return merged;
}

export async function fetchAsDataUrl(path: string): Promise<string | null> {
  try {
    const r = await fetch(path, { cache: "no-store" });
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(typeof fr.result === "string" ? fr.result : null);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function hydrateSnapshotMedia(snap: StudioSnapshot): Promise<StudioSnapshot> {
  let customTexture = snap.customTexture;
  if (customTexture?.path && !(customTexture.dataUrl && customTexture.dataUrl.length > 16)) {
    const dataUrl = await fetchAsDataUrl(customTexture.path);
    if (dataUrl) customTexture = { ...customTexture, dataUrl };
  }
  const customBrushes = await Promise.all(
    (snap.customBrushes ?? []).map(async (b) => {
      if (b.path && !(b.dataUrl && b.dataUrl.length > 16)) {
        const dataUrl = await fetchAsDataUrl(b.path);
        if (dataUrl) return { ...b, dataUrl };
      }
      return b;
    }),
  );
  return { ...snap, customTexture, customBrushes };
}

/** Strip oversized dataUrls when a public path exists — keeps P2P casts small. */
export function compactCastSnapshot(snap: StudioSnapshot): StudioSnapshot {
  const cap = 64_000;
  const trim = <T extends { dataUrl?: string; path?: string }>(item: T): T => {
    const url = item.dataUrl ?? "";
    if (url.length <= cap) return item;
    if (item.path) return { ...item, dataUrl: "" };
    return item;
  };
  return {
    ...snap,
    customTexture: snap.customTexture ? trim(snap.customTexture) : null,
    customBrushes: (snap.customBrushes ?? []).map((b) => trim(b)),
  };
}
