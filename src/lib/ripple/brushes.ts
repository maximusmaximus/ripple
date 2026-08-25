/** Preset brushes — size + weight drive the fluid splat; kind changes the mark shape. */
export type BrushKind = "round" | "soft" | "scatter" | "nib" | "stamp";

/** How diameter changes along a stroke. */
export type BrushFeel = "steady" | "press" | "taper" | "swell" | "nib" | "pulse";

export type BrushId =
  | "hair"
  | "needle"
  | "dart"
  | "ink"
  | "pebble"
  | "bold"
  | "stamp"
  | "soft"
  | "ribbon"
  | "wash"
  | "cloud"
  | "spark"
  | "spray"
  | "grit"
  | "mist"
  | "flood"
  | "quill"
  | "italic"
  | "copper"
  | "brushpen"
  | "taper"
  | "swell"
  | "pulse"
  | "sable";

export type BrushPreset = {
  id: string;
  name: string;
  hint: string;
  radius: number;
  force: number;
  kind: BrushKind;
  feel?: BrushFeel;
  /** Nib angle in radians (0 = horizontal chisel). */
  nib?: number;
  spread?: number;
  grains?: number;
};

/** User PNG silhouette. Angle/spin are live while this brush is selected. */
export type CustomBrush = {
  id: string;
  name: string;
  mime: "image/png";
  dataUrl: string;
  width: number;
  height: number;
  /** Stamp orientation in degrees. */
  angle: number;
  /** Rotation along the stroke, 0 = locked. */
  spin: number;
};

export const MAX_CUSTOM_BRUSHES = 16;
export const MAX_BRUSH_NAME = 24;

export const BRUSHES: BrushPreset[] = [
  { id: "hair", name: "Hair", hint: "A single hair — the thinnest round mark.", radius: 0.007, force: 0.98, kind: "round" },
  { id: "needle", name: "Needle", hint: "Tight round point.", radius: 0.01, force: 0.88, kind: "round" },
  { id: "dart", name: "Dart", hint: "Small, punchy round.", radius: 0.013, force: 1.02, kind: "round" },
  { id: "ink", name: "Ink", hint: "Classic round nib.", radius: 0.02, force: 0.72, kind: "round" },
  { id: "pebble", name: "Pebble", hint: "A heavier round bead.", radius: 0.036, force: 0.62, kind: "round" },
  { id: "bold", name: "Bold", hint: "Fat round stroke.", radius: 0.048, force: 0.95, kind: "round" },
  { id: "stamp", name: "Stamp", hint: "Huge round press.", radius: 0.09, force: 1.05, kind: "round" },
  { id: "soft", name: "Soft", hint: "Feathered round — two stacked dabs.", radius: 0.034, force: 0.42, kind: "soft" },
  { id: "ribbon", name: "Ribbon", hint: "Soft, a little heavier.", radius: 0.042, force: 0.78, kind: "soft" },
  { id: "wash", name: "Wash", hint: "Wide watery bloom.", radius: 0.068, force: 0.32, kind: "soft" },
  { id: "cloud", name: "Cloud", hint: "The softest, lightest veil.", radius: 0.082, force: 0.18, kind: "soft" },
  { id: "spark", name: "Spark", hint: "Tight scatter of sparks.", radius: 0.014, force: 0.92, kind: "scatter", spread: 0.85, grains: 5 },
  { id: "spray", name: "Spray", hint: "Airbrush scatter.", radius: 0.03, force: 0.55, kind: "scatter", spread: 1.8, grains: 4 },
  { id: "grit", name: "Grit", hint: "Dense speckled grit.", radius: 0.018, force: 0.7, kind: "scatter", spread: 1.15, grains: 8 },
  { id: "mist", name: "Mist", hint: "Wide, airy spray.", radius: 0.052, force: 0.22, kind: "scatter", spread: 2.6, grains: 7 },
  { id: "flood", name: "Flood", hint: "Heavy scattered wash.", radius: 0.078, force: 0.26, kind: "scatter", spread: 2.2, grains: 6 },
];

/** Calligraphy / dynamic — diameter changes with angle, speed, or pressure. */
export const SCRIPT_BRUSHES: BrushPreset[] = [
  { id: "quill", name: "Quill", hint: "Chisel at 45° — thick and thin with the turn.", radius: 0.028, force: 0.82, kind: "nib", feel: "nib", nib: Math.PI / 4 },
  { id: "italic", name: "Italic", hint: "Shallower chisel for italic hands.", radius: 0.024, force: 0.78, kind: "nib", feel: "nib", nib: Math.PI / 6 },
  { id: "copper", name: "Copper", hint: "Steep pointed-pen chisel.", radius: 0.022, force: 0.88, kind: "nib", feel: "nib", nib: (55 * Math.PI) / 180 },
  { id: "brushpen", name: "Brushpen", hint: "Press harder, the mark fattens.", radius: 0.032, force: 0.7, kind: "round", feel: "press" },
  { id: "taper", name: "Taper", hint: "Fast strokes thin out to a hair.", radius: 0.03, force: 0.74, kind: "round", feel: "taper" },
  { id: "swell", name: "Swell", hint: "Speed fattens the stroke.", radius: 0.026, force: 0.8, kind: "round", feel: "swell" },
  { id: "pulse", name: "Pulse", hint: "A living, breathing width.", radius: 0.028, force: 0.68, kind: "soft", feel: "pulse" },
  { id: "sable", name: "Sable", hint: "Soft press — watercolor belly.", radius: 0.038, force: 0.55, kind: "soft", feel: "press" },
];

export const ALL_BRUSHES: BrushPreset[] = [...BRUSHES, ...SCRIPT_BRUSHES];

export const DEFAULT_BRUSH_ID: BrushId = "ink";

export const STAMP_PRESET: BrushPreset = {
  id: "ink",
  name: "Custom",
  hint: "Your PNG silhouette.",
  radius: 0.03,
  force: 0.82,
  kind: "stamp",
};

export function isCustomBrushId(id: string | undefined): boolean {
  return typeof id === "string" && id.startsWith("cb_");
}

export function newCustomBrushId(): string {
  return `cb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function sanitizeBrushName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, MAX_BRUSH_NAME);
}

export function getBrush(id: BrushId | string | undefined, customs: CustomBrush[] = []): BrushPreset {
  if (isCustomBrushId(id)) {
    const found = customs.find((c) => c.id === id);
    if (!found) return ALL_BRUSHES.find((b) => b.id === DEFAULT_BRUSH_ID)!;
    return {
      id: found.id,
      name: found.name,
      hint: "Your PNG silhouette.",
      radius: STAMP_PRESET.radius,
      force: STAMP_PRESET.force,
      kind: "stamp",
    };
  }
  return ALL_BRUSHES.find((b) => b.id === id) ?? ALL_BRUSHES.find((b) => b.id === DEFAULT_BRUSH_ID)!;
}

export function getCustomBrush(id: string | undefined, customs: CustomBrush[]): CustomBrush | undefined {
  if (!isCustomBrushId(id)) return undefined;
  return customs.find((c) => c.id === id);
}
