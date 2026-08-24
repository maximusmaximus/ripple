/** Preset brushes — size + weight drive the fluid splat; kind changes the mark shape. */
export type BrushKind = "round" | "soft" | "scatter" | "nib";

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
  id: BrushId;
  name: string;
  radius: number;
  force: number;
  kind: BrushKind;
  feel?: BrushFeel;
  /** Nib angle in radians (0 = horizontal chisel). */
  nib?: number;
  spread?: number;
  grains?: number;
};

export const BRUSHES: BrushPreset[] = [
  { id: "hair", name: "Hair", radius: 0.007, force: 0.98, kind: "round" },
  { id: "needle", name: "Needle", radius: 0.01, force: 0.88, kind: "round" },
  { id: "dart", name: "Dart", radius: 0.013, force: 1.02, kind: "round" },
  { id: "ink", name: "Ink", radius: 0.02, force: 0.72, kind: "round" },
  { id: "pebble", name: "Pebble", radius: 0.036, force: 0.62, kind: "round" },
  { id: "bold", name: "Bold", radius: 0.048, force: 0.95, kind: "round" },
  { id: "stamp", name: "Stamp", radius: 0.09, force: 1.05, kind: "round" },
  { id: "soft", name: "Soft", radius: 0.034, force: 0.42, kind: "soft" },
  { id: "ribbon", name: "Ribbon", radius: 0.042, force: 0.78, kind: "soft" },
  { id: "wash", name: "Wash", radius: 0.068, force: 0.32, kind: "soft" },
  { id: "cloud", name: "Cloud", radius: 0.082, force: 0.18, kind: "soft" },
  { id: "spark", name: "Spark", radius: 0.014, force: 0.92, kind: "scatter", spread: 0.85, grains: 5 },
  { id: "spray", name: "Spray", radius: 0.03, force: 0.55, kind: "scatter", spread: 1.8, grains: 4 },
  { id: "grit", name: "Grit", radius: 0.018, force: 0.7, kind: "scatter", spread: 1.15, grains: 8 },
  { id: "mist", name: "Mist", radius: 0.052, force: 0.22, kind: "scatter", spread: 2.6, grains: 7 },
  { id: "flood", name: "Flood", radius: 0.078, force: 0.26, kind: "scatter", spread: 2.2, grains: 6 },
];

/** Calligraphy / dynamic — diameter changes with angle, speed, or pressure. */
export const SCRIPT_BRUSHES: BrushPreset[] = [
  { id: "quill", name: "Quill", radius: 0.028, force: 0.82, kind: "nib", feel: "nib", nib: Math.PI / 4 },
  { id: "italic", name: "Italic", radius: 0.024, force: 0.78, kind: "nib", feel: "nib", nib: Math.PI / 6 },
  { id: "copper", name: "Copper", radius: 0.022, force: 0.88, kind: "nib", feel: "nib", nib: (55 * Math.PI) / 180 },
  { id: "brushpen", name: "Brushpen", radius: 0.032, force: 0.7, kind: "round", feel: "press" },
  { id: "taper", name: "Taper", radius: 0.03, force: 0.74, kind: "round", feel: "taper" },
  { id: "swell", name: "Swell", radius: 0.026, force: 0.8, kind: "round", feel: "swell" },
  { id: "pulse", name: "Pulse", radius: 0.028, force: 0.68, kind: "soft", feel: "pulse" },
  { id: "sable", name: "Sable", radius: 0.038, force: 0.55, kind: "soft", feel: "press" },
];

export const ALL_BRUSHES: BrushPreset[] = [...BRUSHES, ...SCRIPT_BRUSHES];

export const DEFAULT_BRUSH_ID: BrushId = "ink";

export function getBrush(id: BrushId | string | undefined): BrushPreset {
  return ALL_BRUSHES.find((b) => b.id === id) ?? ALL_BRUSHES.find((b) => b.id === DEFAULT_BRUSH_ID)!;
}
