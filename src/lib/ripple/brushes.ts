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
  /** Mark rotation in degrees. */
  angle: number;
  /** Cross-stroke width, 1 = round, lower = a thinner blade. */
  width: number;
  /** Extra spin along the stroke, 0 = locked. */
  spin: number;
};

/** User PNG silhouette. Angle/width/spin are set on import and stay editable. */
export type CustomBrush = {
  id: string;
  name: string;
  mime: "image/png";
  dataUrl: string;
  width: number;
  height: number;
  /** Stamp orientation in degrees. */
  angle: number;
  /** Cross-stroke width, 1 = full stamp, lower = thinner. */
  markWidth: number;
  /** Rotation along the stroke, 0 = locked. */
  spin: number;
  /** Repo-relative public path after persist (`/studio/media/...`). */
  path?: string;
};

export type BrushShape = { angle: number; width: number; spin: number };

export function clampBrushWidth(n: number) {
  return Math.max(0.18, Math.min(1, n));
}

export function clampBrushAngle(n: number) {
  return ((Math.round(n) % 360) + 360) % 360;
}

export function normalizeBrushShape(shape: Partial<BrushShape> | undefined, fallback: BrushShape): BrushShape {
  return {
    angle: clampBrushAngle(typeof shape?.angle === "number" ? shape.angle : fallback.angle),
    width: clampBrushWidth(typeof shape?.width === "number" ? shape.width : fallback.width),
    spin: Math.max(0, Math.min(8, typeof shape?.spin === "number" ? shape.spin : fallback.spin)),
  };
}

export const MAX_CUSTOM_BRUSHES = 16;
export const MAX_BRUSH_NAME = 24;

export const BRUSHES: BrushPreset[] = [
  { id: "hair", name: "Hair", hint: "A single hair — the thinnest round mark.", radius: 0.007, force: 0.98, kind: "round" , angle: 0, width: 0.32, spin: 0 },
  { id: "needle", name: "Needle", hint: "Tight round point.", radius: 0.01, force: 0.88, kind: "round" , angle: 0, width: 0.4, spin: 0 },
  { id: "dart", name: "Dart", hint: "Small, punchy round.", radius: 0.013, force: 1.02, kind: "round" , angle: 12, width: 0.52, spin: 0 },
  { id: "ink", name: "Ink", hint: "Classic round nib.", radius: 0.02, force: 0.72, kind: "round" , angle: 0, width: 1, spin: 0 },
  { id: "pebble", name: "Pebble", hint: "A heavier round bead.", radius: 0.036, force: 0.62, kind: "round" , angle: 0, width: 1, spin: 0 },
  { id: "bold", name: "Bold", hint: "Fat round stroke.", radius: 0.048, force: 0.95, kind: "round" , angle: 0, width: 0.92, spin: 0 },
  { id: "stamp", name: "Stamp", hint: "Huge round press.", radius: 0.09, force: 1.05, kind: "round" , angle: 0, width: 1, spin: 0 },
  { id: "soft", name: "Soft", hint: "Feathered round — two stacked dabs.", radius: 0.034, force: 0.42, kind: "soft" , angle: 0, width: 1, spin: 0 },
  { id: "ribbon", name: "Ribbon", hint: "Soft, a little heavier.", radius: 0.042, force: 0.78, kind: "soft" , angle: 22, width: 0.42, spin: 0 },
  { id: "wash", name: "Wash", hint: "Wide watery bloom.", radius: 0.068, force: 0.32, kind: "soft" , angle: 0, width: 0.82, spin: 0 },
  { id: "cloud", name: "Cloud", hint: "The softest, lightest veil.", radius: 0.082, force: 0.18, kind: "soft" , angle: 8, width: 1, spin: 0.2 },
  { id: "spark", name: "Spark", hint: "Tight scatter of sparks.", radius: 0.014, force: 0.92, kind: "scatter", spread: 0.85, grains: 5 , angle: 0, width: 0.55, spin: 0 },
  { id: "spray", name: "Spray", hint: "Airbrush scatter.", radius: 0.03, force: 0.55, kind: "scatter", spread: 1.8, grains: 4 , angle: 0, width: 1, spin: 0 },
  { id: "grit", name: "Grit", hint: "Dense speckled grit.", radius: 0.018, force: 0.7, kind: "scatter", spread: 1.15, grains: 8 , angle: 18, width: 0.68, spin: 0 },
  { id: "mist", name: "Mist", hint: "Wide, airy spray.", radius: 0.052, force: 0.22, kind: "scatter", spread: 2.6, grains: 7 , angle: 0, width: 1, spin: 0.4 },
  { id: "flood", name: "Flood", hint: "Heavy scattered wash.", radius: 0.078, force: 0.26, kind: "scatter", spread: 2.2, grains: 6 , angle: 0, width: 0.88, spin: 0 },
];

/** Calligraphy / dynamic — diameter changes with angle, speed, or pressure. */
export const SCRIPT_BRUSHES: BrushPreset[] = [
  { id: "quill", name: "Quill", hint: "Chisel at 45° — thick and thin with the turn.", radius: 0.028, force: 0.82, kind: "nib", feel: "nib", nib: Math.PI / 4 , angle: 45, width: 0.3, spin: 0 },
  { id: "italic", name: "Italic", hint: "Shallower chisel for italic hands.", radius: 0.024, force: 0.78, kind: "nib", feel: "nib", nib: Math.PI / 6 , angle: 30, width: 0.36, spin: 0 },
  { id: "copper", name: "Copper", hint: "Steep pointed-pen chisel.", radius: 0.022, force: 0.88, kind: "nib", feel: "nib", nib: (55 * Math.PI) / 180 , angle: 55, width: 0.26, spin: 0 },
  { id: "brushpen", name: "Brushpen", hint: "Press harder, the mark fattens.", radius: 0.032, force: 0.7, kind: "round", feel: "press" , angle: 18, width: 0.52, spin: 0 },
  { id: "taper", name: "Taper", hint: "Fast strokes thin out to a hair.", radius: 0.03, force: 0.74, kind: "round", feel: "taper" , angle: 8, width: 0.4, spin: 0 },
  { id: "swell", name: "Swell", hint: "Speed fattens the stroke.", radius: 0.026, force: 0.8, kind: "round", feel: "swell" , angle: 352, width: 0.48, spin: 0 },
  { id: "pulse", name: "Pulse", hint: "A living, breathing width.", radius: 0.028, force: 0.68, kind: "soft", feel: "pulse" , angle: 0, width: 0.7, spin: 1.2 },
  { id: "sable", name: "Sable", hint: "Soft press — watercolor belly.", radius: 0.038, force: 0.55, kind: "soft", feel: "press" , angle: 12, width: 0.62, spin: 0 },
];

export const ALL_BRUSHES: BrushPreset[] = [...BRUSHES, ...SCRIPT_BRUSHES];

export const DEFAULT_BRUSH_ID: BrushId = "ink";

export const DIA_MIN = 0.008;
export const DIA_MAX = 0.12;

export type BrushSpan = { start: number; mid: number; end: number; min?: number; max?: number };

export function clampDia(n: number) {
  return Math.max(DIA_MIN, Math.min(DIA_MAX, n));
}

export function defaultBrushSpan(radius: number): BrushSpan {
  const dia = clampDia(radius * 2);
  const start = clampDia(Math.max(dia * 1.12, dia + 0.004));
  const end = clampDia(Math.min(dia * 0.36, start - 0.01));
  const mid = clampDia(dia * 0.82);
  return { start, mid, end };
}

export function normalizeBrushSpan(span: Partial<BrushSpan> & { min?: number; max?: number }): BrushSpan {
  const start = clampDia(
    typeof span.start === "number" ? span.start : typeof span.max === "number" ? span.max : 0.04,
  );
  const end = clampDia(
    typeof span.end === "number" ? span.end : typeof span.min === "number" ? span.min : DIA_MIN,
  );
  const mid = clampDia(
    typeof span.mid === "number" ? span.mid : (start + end) / 2,
  );
  return { start, mid, end };
}

export const STAMP_PRESET: BrushPreset = {
  id: "ink",
  name: "Custom",
  hint: "Your PNG silhouette.",
  radius: 0.03,
  force: 0.82,
  kind: "stamp",
  angle: 0,
  width: 1,
  spin: 0,
};

export function defaultShapeFor(brush: BrushPreset | CustomBrush): BrushShape {
  if ("markWidth" in brush) {
    return normalizeBrushShape(
      { angle: brush.angle, width: brush.markWidth, spin: brush.spin },
      { angle: 0, width: 1, spin: 0 },
    );
  }
  return normalizeBrushShape(
    { angle: brush.angle, width: brush.width, spin: brush.spin },
    { angle: 0, width: 1, spin: 0 },
  );
}

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
      angle: found.angle,
      width: found.markWidth ?? 1,
      spin: found.spin,
    };
  }
  return ALL_BRUSHES.find((b) => b.id === id) ?? ALL_BRUSHES.find((b) => b.id === DEFAULT_BRUSH_ID)!;
}

export function getCustomBrush(id: string | undefined, customs: CustomBrush[]): CustomBrush | undefined {
  if (!isCustomBrushId(id)) return undefined;
  return customs.find((c) => c.id === id);
}
