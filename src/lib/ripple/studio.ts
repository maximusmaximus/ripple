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

export const TEXTURE_FITS: { id: TextureFit; name: string; hint: string }[] = [
  { id: "cover", name: "Cover", hint: "Fill the frame — crop the overflow." },
  { id: "contain", name: "Contain", hint: "Fit inside — letterbox if needed." },
  { id: "stretch", name: "Stretch", hint: "Warp to the canvas." },
];

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

export async function loadHomebasePresets(): Promise<NamedPreset[]> {
  try {
    const r = await fetch("/studio/presets.json", { cache: "no-store" });
    if (!r.ok) return [];
    const data = (await r.json()) as { presets?: NamedPreset[] };
    return (data.presets ?? []).map((p) => ({ ...p, source: "homebase" as const }));
  } catch {
    return [];
  }
}
