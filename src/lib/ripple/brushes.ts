/** Preset brushes — size + weight drive the fluid splat; kind changes the mark shape. */
export type BrushKind = "round" | "soft" | "scatter";

export type BrushId = "needle" | "ink" | "soft" | "bold" | "spray" | "wash";

export type BrushPreset = {
  id: BrushId;
  name: string;
  /** Normalized radius (sim space). */
  radius: number;
  /** Splat force / weight. */
  force: number;
  kind: BrushKind;
};

export const BRUSHES: BrushPreset[] = [
  { id: "needle", name: "Needle", radius: 0.01, force: 0.88, kind: "round" },
  { id: "ink", name: "Ink", radius: 0.02, force: 0.72, kind: "round" },
  { id: "soft", name: "Soft", radius: 0.034, force: 0.42, kind: "soft" },
  { id: "bold", name: "Bold", radius: 0.048, force: 0.95, kind: "round" },
  { id: "spray", name: "Spray", radius: 0.03, force: 0.55, kind: "scatter" },
  { id: "wash", name: "Wash", radius: 0.068, force: 0.32, kind: "soft" },
];

export const DEFAULT_BRUSH_ID: BrushId = "ink";

export function getBrush(id: BrushId | string | undefined): BrushPreset {
  return BRUSHES.find((b) => b.id === id) ?? BRUSHES.find((b) => b.id === DEFAULT_BRUSH_ID)!;
}
