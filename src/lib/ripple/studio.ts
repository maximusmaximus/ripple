import type { BrushId } from "@/lib/ripple/brushes";
import type { BrushFxId, FxLayerId } from "@/lib/ripple/blend";
import type { ColorPair, ColorStop, PaletteId } from "@/lib/ripple/palettes";
import type { TextureId } from "@/lib/ripple/textures";

export type TextureFit = "cover" | "contain" | "stretch";

export type CustomTexture = {
  mime: string;
  dataUrl: string;
  width: number;
  height: number;
};

export type StudioSnapshot = {
  worldId: PaletteId;
  colorRanges: Partial<Record<PaletteId, { start: number; end: number }>>;
  colorPairs: Partial<Record<PaletteId, ColorPair>>;
  colorStops: Partial<Record<PaletteId, ColorStop[]>>;
  viscosity: number;
  waveStrength: number;
  brushDiameter: number;
  brushId: BrushId;
  brushFx: Partial<Record<BrushId, BrushFxId | BrushFxId[]>>;
  brushFxOpacity: number;
  fxLayers: FxLayerId[];
  shadowOn: boolean;
  shadowColor: string;
  shadowAngle: number;
  shadowOpacity: number;
  textureId: TextureId;
  textureFit: TextureFit;
  customTexture: CustomTexture | null;
  cameraInteract: number;
  micSensitivity: number;
  gyroSensitivity: number;
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
export const MAX_STUDIO_PRESETS = 40;
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
    brushId: "ink",
    brushFx: { ink: ["normal"] },
    brushFxOpacity: 0.7,
    fxLayers: ["brush"],
    shadowOn: false,
    shadowColor: "#0a0810",
    shadowAngle: 135,
    shadowOpacity: 0.45,
    textureId: "none",
    textureFit: "cover",
    customTexture: null,
    cameraInteract: 0.85,
    micSensitivity: 0.4,
    gyroSensitivity: 0.5,
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
  return name.replace(/\s+/g, " ").trim().slice(0, MAX_PRESET_NAME);
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
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return [];
    return asPresets(await r.json());
  } catch {
    return [];
  }
}

/** Local shipped file first, then GitHub homebase so restarts/updates still load. */
export async function loadHomebasePresets(): Promise<NamedPreset[]> {
  const [local, remote] = await Promise.all([
    fetchPresetList("/studio/presets.json"),
    fetchPresetList(GITHUB_HOMEBASE_URL),
  ]);
  const seen = new Set<string>();
  const merged: NamedPreset[] = [];
  for (const p of [easyPreset(), ...local, ...remote]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push(p);
  }
  return merged;
}
