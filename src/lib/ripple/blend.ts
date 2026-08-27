/** How the live stroke mixes with the bed and camera. */
export type BrushFxId =
  | "normal"
  | "darken"
  | "lighten"
  | "contrast"
  | "inversion"
  | "component"
  | "multiply"
  | "screen"
  | "overlay"
  | "color";

export type BrushFx = {
  id: BrushFxId;
  /** Shader enum 0–9 */
  code: number;
  name: string;
  hint: string;
};

export type BrushFxGroup = {
  id: string;
  label: string;
  blurb: string;
  modes: BrushFx[];
};

export const BRUSH_FX: BrushFx[] = [
  { id: "normal", code: 0, name: "Normal", hint: "Layer covers — no extra mix." },
  { id: "darken", code: 1, name: "Darken", hint: "Keeps whichever is darker." },
  { id: "multiply", code: 6, name: "Multiply", hint: "Stains the bed like wet ink." },
  { id: "lighten", code: 2, name: "Lighten", hint: "Keeps whichever is brighter." },
  { id: "screen", code: 7, name: "Screen", hint: "Bleaches the bed — like a projector." },
  { id: "overlay", code: 8, name: "Overlay", hint: "Bed contrast, tinted by the layer." },
  { id: "contrast", code: 3, name: "Contrast", hint: "Hard light — the layer sculpts bright and dark." },
  { id: "inversion", code: 4, name: "Inversion", hint: "Layer subtracts the bed (difference)." },
  { id: "color", code: 9, name: "Color", hint: "Layer hue on the bed’s brightness." },
  { id: "component", code: 5, name: "Component", hint: "Layer remaps the bed’s RGB channels." },
];

export const BRUSH_FX_GROUPS: BrushFxGroup[] = [
  {
    id: "cover",
    label: "Cover",
    blurb: "Reset the stack — the layer just covers.",
    modes: BRUSH_FX.filter((m) => m.id === "normal"),
  },
  {
    id: "dark",
    label: "Darken",
    blurb: "Stacks with Contrast, Invert, Color. Cancels Lighten.",
    modes: BRUSH_FX.filter((m) => m.id === "darken" || m.id === "multiply"),
  },
  {
    id: "light",
    label: "Lighten",
    blurb: "Stacks with Contrast, Invert, Color. Cancels Darken.",
    modes: BRUSH_FX.filter((m) => m.id === "lighten" || m.id === "screen"),
  },
  {
    id: "punch",
    label: "Contrast",
    blurb: "Stacks with Darken or Lighten, Invert, Color.",
    modes: BRUSH_FX.filter((m) => m.id === "overlay" || m.id === "contrast"),
  },
  {
    id: "flip",
    label: "Invert",
    blurb: "Stacks with anything — last in the mix.",
    modes: BRUSH_FX.filter((m) => m.id === "inversion"),
  },
  {
    id: "recolor",
    label: "Color",
    blurb: "Stacks with Darken or Lighten, Contrast, Invert.",
    modes: BRUSH_FX.filter((m) => m.id === "color" || m.id === "component"),
  },
];

export const DEFAULT_BRUSH_FX: BrushFxId = "normal";

const DARK_FAMILY = new Set<BrushFxId>(["darken", "multiply"]);
const LIGHT_FAMILY = new Set<BrushFxId>(["lighten", "screen"]);

export function getBrushFx(id: BrushFxId | string | undefined): BrushFx {
  return BRUSH_FX.find((m) => m.id === id) ?? BRUSH_FX[0]!;
}

function isFxId(id: string): id is BrushFxId {
  return BRUSH_FX.some((m) => m.id === id);
}

/** Normalize persisted value (string or list) into a valid stack. */
export function asFxList(v: BrushFxId | BrushFxId[] | string | undefined | null): BrushFxId[] {
  if (v == null || v === "") return [DEFAULT_BRUSH_FX];
  const raw = Array.isArray(v) ? v : [v];
  return mergeBrushFx(raw.filter((x): x is BrushFxId => typeof x === "string" && isFxId(x)));
}

/** Drop Normal when anything else is on; dark vs light families cancel. */
export function mergeBrushFx(ids: BrushFxId[]): BrushFxId[] {
  let next = ids.filter((id) => id !== "normal" && isFxId(id));
  const lastDark = [...next].reverse().find((id) => DARK_FAMILY.has(id));
  const lastLight = [...next].reverse().find((id) => LIGHT_FAMILY.has(id));
  if (lastDark && lastLight) {
    const iD = next.lastIndexOf(lastDark);
    const iL = next.lastIndexOf(lastLight);
    next = iD >= iL ? next.filter((id) => !LIGHT_FAMILY.has(id)) : next.filter((id) => !DARK_FAMILY.has(id));
  }
  const seen = new Set<BrushFxId>();
  next = next.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return next.length ? next : [DEFAULT_BRUSH_FX];
}

export function toggleBrushFx(current: BrushFxId[], id: BrushFxId): BrushFxId[] {
  if (id === "normal") return [DEFAULT_BRUSH_FX];
  const cur = mergeBrushFx(current);
  if (cur.includes(id)) {
    const next = cur.filter((x) => x !== id);
    return next.length ? next : [DEFAULT_BRUSH_FX];
  }
  return mergeBrushFx([...cur, id]);
}

/** Bitmask for the shader. Normal = 0. Bit N = mode code N. */
export function fxMask(ids: BrushFxId[]): number {
  let m = 0;
  for (const id of mergeBrushFx(ids)) {
    if (id === "normal") continue;
    m |= 1 << getBrushFx(id).code;
  }
  return m;
}

export function fxConflictsWith(active: BrushFxId[], id: BrushFxId): boolean {
  if (id === "normal") return false;
  const cur = mergeBrushFx(active);
  if (cur.includes("normal") || cur.length === 0) return false;
  if (DARK_FAMILY.has(id) && cur.some((x) => LIGHT_FAMILY.has(x))) return true;
  if (LIGHT_FAMILY.has(id) && cur.some((x) => DARK_FAMILY.has(x))) return true;
  return false;
}

export type FxLayerId = "camera" | "mic" | "brush" | "texture" | "shadow";

export const FX_LAYERS: { id: FxLayerId; name: string; hint: string; bit: number }[] = [
  { id: "camera", name: "Camera", hint: "Mix the live feed over what’s already on the surface.", bit: 1 },
  { id: "mic", name: "Mic", hint: "Mix incoming sound into the live mark — not paint that’s already down.", bit: 2 },
  { id: "brush", name: "Brush", hint: "Mix the next stroke over existing color. Settled paint stays put.", bit: 4 },
  { id: "texture", name: "Texture", hint: "Mix grain into the live mark, over colors already on the bed.", bit: 8 },
  { id: "shadow", name: "Brush Shadow", hint: "Mix the live cast over the surface. Turn the shadow on under Width.", bit: 16 },
];

export const DEFAULT_FX_LAYERS: FxLayerId[] = ["brush"];

function isLayerId(id: string): id is FxLayerId {
  return FX_LAYERS.some((l) => l.id === id);
}

export function asFxLayers(v: FxLayerId[] | string[] | undefined | null): FxLayerId[] {
  if (v == null) return [...DEFAULT_FX_LAYERS];
  const raw = Array.isArray(v) ? v : [];
  const next = raw.filter((x): x is FxLayerId => typeof x === "string" && isLayerId(x));
  const seen = new Set<FxLayerId>();
  return next.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function toggleFxLayer(current: FxLayerId[], id: FxLayerId): FxLayerId[] {
  const cur = asFxLayers(current);
  if (cur.includes(id)) return cur.filter((x) => x !== id);
  return [...cur, id];
}

export function fxLayerMask(ids: FxLayerId[]): number {
  let m = 0;
  for (const id of asFxLayers(ids)) {
    const bit = FX_LAYERS.find((l) => l.id === id)?.bit ?? 0;
    m |= bit;
  }
  return m;
}


