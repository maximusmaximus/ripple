import type { BrushId } from "@/lib/ripple/brushes";
import type { BrushFxId } from "@/lib/ripple/blend";

export type PaletteId =
  | "lens"
  | "voice"
  | "slosh"
  | "mirror"
  | "ember"
  | "gel"
  | "volt"
  | "magma"
  | "ghost"
  | "riot"
  | "prism"
  | "tide"
  | "noir"
  | "halo"
  | "storm"
  | "inkwell"
  | "plasma"
  | "fossil"
  | "aurora"
  | "eclipse";

export type ColorPair = {
  /** Base / key light — crests, highlights. */
  key: string;
  /** Shadow — troughs, depth. */
  shadow: string;
};

export type ColorStop = {
  id: string;
  /** Position along the gradient 0–1. */
  t: number;
  color: string;
  /** 0 = hole (see camera / bed), 1 = solid. */
  alpha?: number;
};

export type Palette = {
  id: PaletteId;
  name: string;
  blurb: string;
  key: string;
  shadow: string;
  colors: string[];
  defaultRange: [number, number];
  viscosity: number;
  waveStrength: number;
  cameraMix: number;
  micDrive: number;
  gyroDrive: number;
  brushId: BrushId;
  brushFx: BrushFxId[];
  brushFxOpacity: number;
  /** Optional authored gradient (alpha < 1 punches camera through). */
  stops?: ColorStop[];
};

export const PALETTE_ORDER: PaletteId[] = [
  "lens",
  "voice",
  "slosh",
  "mirror",
  "ember",
  "gel",
  "volt",
  "magma",
  "ghost",
  "riot",
  "prism",
  "tide",
  "noir",
  "halo",
  "storm",
  "inkwell",
  "plasma",
  "fossil",
  "aurora",
  "eclipse",
];

/** 6-stop water ramp: deep shadow → shadow → mid → key → foam. */
export function rampFromPair(shadow: string, key: string): string[] {
  const s = parseHex(shadow);
  const k = parseHex(key);
  const deep = mixRgb(s, [0, 0, 0], 0.42);
  const towardKey = mixRgb(s, k, 0.32);
  const mid = mixRgb(s, k, 0.58);
  const foam = mixRgb(k, [255, 255, 255], 0.36);
  return [hexRgb(deep), normalizeHex(shadow), hexRgb(towardKey), hexRgb(mid), normalizeHex(key), hexRgb(foam)];
}

function mkStops(
  id: string,
  parts: Array<[number, string] | [number, string, number]>,
): ColorStop[] {
  return parts.map((p, i) => ({
    id: `${id}-${i}`,
    t: p[0],
    color: normalizeHex(p[1]),
    alpha: p[2] ?? 1,
  }));
}

function world(
  id: PaletteId,
  name: string,
  blurb: string,
  shadow: string,
  key: string,
  rest: {
    defaultRange: [number, number];
    viscosity: number;
    waveStrength: number;
    cameraMix: number;
    micDrive: number;
    gyroDrive: number;
    brushId: BrushId;
    brushFx: BrushFxId[];
    brushFxOpacity: number;
    colors?: string[];
    stops?: ColorStop[];
  },
): Palette {
  const { colors, ...feel } = rest;
  return {
    id,
    name,
    blurb,
    key: normalizeHex(key),
    shadow: normalizeHex(shadow),
    colors: colors ?? rampFromPair(shadow, key),
    ...feel,
    gyroDrive: Math.max(0, Math.min(1.5, feel.gyroDrive * 0.25)),
  };
}

export const PALETTES: Record<PaletteId, Palette> = {
  lens: world("lens", "Lens", "Glass over the live feed — multiply stains the camera.", "#07141f", "#d7f6ff", {
    defaultRange: [0.02, 0.98],
    viscosity: 0.991,
    waveStrength: 0.32,
    cameraMix: 0.96,
    micDrive: 0.22,
    gyroDrive: 0.38,
    brushId: "ink",
    brushFx: ["multiply", "color"],
    brushFxOpacity: 0.72,
    colors: ["#03080e", "#07141f", "#1a4a5c", "#7ec8d8", "#d7f6ff", "#ffffff"],
    stops: mkStops("lens", [
      [0, "#03080e", 0.55],
      [0.18, "#07141f", 0.35],
      [0.4, "#1a4a5c", 0.25],
      [0.62, "#7ec8d8", 0.55],
      [0.82, "#d7f6ff", 0.85],
      [1, "#ffffff", 1],
    ]),
  }),
  voice: world("voice", "Voice", "Talk and the ramp jumps — pulse brush, overlay.", "#1a0524", "#ff4fd8", {
    defaultRange: [0.05, 0.95],
    viscosity: 0.972,
    waveStrength: 0.74,
    cameraMix: 0.36,
    micDrive: 1.42,
    gyroDrive: 0.32,
    brushId: "pulse",
    brushFx: ["overlay"],
    brushFxOpacity: 0.9,
    colors: ["#0a0210", "#1a0524", "#6b1a8a", "#c43adf", "#ff4fd8", "#ffe8ff"],
  }),
  slosh: world("slosh", "Slosh", "Gyro pours a heavy flood. Tilt the whole surface.", "#101820", "#8ab4c8", {
    defaultRange: [0.0, 1.0],
    viscosity: 0.938,
    waveStrength: 0.98,
    cameraMix: 0.24,
    micDrive: 0.28,
    gyroDrive: 1.48,
    brushId: "flood",
    brushFx: ["normal"],
    brushFxOpacity: 0.55,
    colors: ["#07090c", "#101820", "#2a3e50", "#5a7a90", "#8ab4c8", "#e4f0f6"],
  }),
  mirror: world("mirror", "Mirror", "Slow chrome — paint hue on the camera’s brightness.", "#1a1c1e", "#e8eaee", {
    defaultRange: [0.12, 0.88],
    viscosity: 0.994,
    waveStrength: 0.4,
    cameraMix: 0.9,
    micDrive: 0.2,
    gyroDrive: 0.68,
    brushId: "ribbon",
    brushFx: ["color", "overlay"],
    brushFxOpacity: 0.82,
    colors: ["#0a0b0c", "#1a1c1e", "#4a4e54", "#8a9098", "#c8ccd2", "#e8eaee"],
  }),
  ember: world("ember", "Ember", "Fire screens over the feed. Mic crackles the crests.", "#2a0600", "#ffb020", {
    defaultRange: [0.08, 0.92],
    viscosity: 0.966,
    waveStrength: 0.9,
    cameraMix: 0.58,
    micDrive: 0.88,
    gyroDrive: 0.52,
    brushId: "spray",
    brushFx: ["screen", "overlay"],
    brushFxOpacity: 0.86,
    colors: ["#0a0200", "#2a0600", "#8b1a00", "#e85d04", "#ffb020", "#fff0c4"],
  }),
  gel: world("gel", "Gel", "Thick stained wash. Almost still — camera as a tint.", "#0c221c", "#b8ffe0", {
    defaultRange: [0.0, 1.0],
    viscosity: 0.997,
    waveStrength: 0.18,
    cameraMix: 0.54,
    micDrive: 0.12,
    gyroDrive: 0.16,
    brushId: "wash",
    brushFx: ["multiply"],
    brushFxOpacity: 0.92,
    colors: ["#04140e", "#0c221c", "#1a5a48", "#4ad4a0", "#b8ffe0", "#f4fff8"],
  }),
  volt: world("volt", "Volt", "Snappy neon sparks. Mic and waves are loud.", "#031a08", "#c8ff3a", {
    defaultRange: [0.15, 0.95],
    viscosity: 0.95,
    waveStrength: 1.1,
    cameraMix: 0.48,
    micDrive: 1.18,
    gyroDrive: 0.84,
    brushId: "spark",
    brushFx: ["screen"],
    brushFxOpacity: 0.88,
    colors: ["#010a04", "#031a08", "#0a5a12", "#3dff3d", "#c8ff3a", "#f4ffe0"],
  }),
  magma: world("magma", "Magma", "Gyro drags hot mass. Multiply + contrast stamps.", "#1a0500", "#ff6a00", {
    defaultRange: [0.1, 0.9],
    viscosity: 0.954,
    waveStrength: 1.16,
    cameraMix: 0.16,
    micDrive: 0.52,
    gyroDrive: 1.08,
    brushId: "stamp",
    brushFx: ["multiply", "contrast"],
    brushFxOpacity: 0.95,
    colors: ["#080200", "#1a0500", "#6b1200", "#c43a00", "#ff6a00", "#ffd0a0"],
  }),
  ghost: world("ghost", "Ghost", "A veil. Transparent mids so the camera is the picture.", "#2a2830", "#f4f0ff", {
    defaultRange: [0.05, 0.98],
    viscosity: 0.995,
    waveStrength: 0.26,
    cameraMix: 1.0,
    micDrive: 0.26,
    gyroDrive: 0.22,
    brushId: "cloud",
    brushFx: ["color"],
    brushFxOpacity: 0.52,
    colors: ["#141318", "#2a2830", "#6a6878", "#b8b4c8", "#e8e4f4", "#f4f0ff"],
    stops: mkStops("ghost", [
      [0, "#141318", 0.22],
      [0.22, "#2a2830", 0.12],
      [0.48, "#b8b4c8", 0.18],
      [0.72, "#e8e4f4", 0.4],
      [1, "#f4f0ff", 0.7],
    ]),
  }),
  riot: world("riot", "Riot", "Everything fights — invert overlay, grit, all sensors.", "#120018", "#00f0ff", {
    defaultRange: [0.0, 1.0],
    viscosity: 0.936,
    waveStrength: 1.24,
    cameraMix: 0.8,
    micDrive: 1.42,
    gyroDrive: 1.38,
    brushId: "grit",
    brushFx: ["inversion", "overlay"],
    brushFxOpacity: 0.94,
    colors: ["#0a0010", "#120018", "#d4007a", "#ff5a00", "#ffe14a", "#00f0ff"],
  }),
  prism: world("prism", "Prism", "Paint remaps the camera’s RGB. Rainbow sparks.", "#12081c", "#f4e8ff", {
    defaultRange: [0.04, 0.96],
    viscosity: 0.978,
    waveStrength: 0.56,
    cameraMix: 0.93,
    micDrive: 0.42,
    gyroDrive: 0.46,
    brushId: "spark",
    brushFx: ["component", "overlay"],
    brushFxOpacity: 0.8,
    colors: ["#0a0414", "#1a0a3a", "#2a6bff", "#19e3c2", "#f0d44a", "#ff4ad2"],
  }),
  tide: world("tide", "Tide", "Gyro wells. Transparent troughs — camera under the swell.", "#041820", "#9ee8ff", {
    defaultRange: [0.0, 1.0],
    viscosity: 0.962,
    waveStrength: 0.72,
    cameraMix: 0.74,
    micDrive: 0.3,
    gyroDrive: 1.22,
    brushId: "wash",
    brushFx: ["multiply"],
    brushFxOpacity: 0.7,
    colors: ["#020c12", "#041820", "#0c4a5c", "#2a90a8", "#7ad4ea", "#e8fbff"],
    stops: mkStops("tide", [
      [0, "#020c12", 0.2],
      [0.2, "#041820", 0.15],
      [0.45, "#0c4a5c", 0.35],
      [0.7, "#7ad4ea", 0.7],
      [1, "#e8fbff", 1],
    ]),
  }),
  noir: world("noir", "Noir", "Silver film. Darken + multiply keeps the darker of paint or feed.", "#0c0c0e", "#d8d4cc", {
    defaultRange: [0.08, 0.9],
    viscosity: 0.988,
    waveStrength: 0.34,
    cameraMix: 0.78,
    micDrive: 0.14,
    gyroDrive: 0.4,
    brushId: "ink",
    brushFx: ["darken", "multiply"],
    brushFxOpacity: 0.88,
    colors: ["#050506", "#0c0c0e", "#2a2a2e", "#6a6864", "#b0aca4", "#d8d4cc"],
  }),
  halo: world("halo", "Halo", "Projector bleach — screen + lighten, gold sable.", "#1a1008", "#ffe9a8", {
    defaultRange: [0.1, 0.94],
    viscosity: 0.986,
    waveStrength: 0.48,
    cameraMix: 0.84,
    micDrive: 0.46,
    gyroDrive: 0.28,
    brushId: "sable",
    brushFx: ["screen", "lighten"],
    brushFxOpacity: 0.78,
    colors: ["#0c0804", "#1a1008", "#6a4010", "#d4a04a", "#ffe9a8", "#fff8e8"],
  }),
  storm: world("storm", "Storm", "Hard weather. High waves, mic highs, grit contrast.", "#081018", "#c8e4ff", {
    defaultRange: [0.06, 0.94],
    viscosity: 0.946,
    waveStrength: 1.2,
    cameraMix: 0.4,
    micDrive: 1.16,
    gyroDrive: 0.92,
    brushId: "grit",
    brushFx: ["overlay", "contrast"],
    brushFxOpacity: 0.9,
    colors: ["#04080c", "#081018", "#1a3a58", "#3a78b0", "#8abee8", "#c8e4ff"],
  }),
  inkwell: world("inkwell", "Inkwell", "Quill calligraphy. Multiply ink on paper-camera.", "#140c08", "#f2e6d4", {
    defaultRange: [0.0, 0.92],
    viscosity: 0.99,
    waveStrength: 0.36,
    cameraMix: 0.44,
    micDrive: 0.18,
    gyroDrive: 0.56,
    brushId: "quill",
    brushFx: ["multiply"],
    brushFxOpacity: 1,
    colors: ["#0a0604", "#140c08", "#3a2418", "#6a4830", "#c4a888", "#f2e6d4"],
  }),
  plasma: world("plasma", "Plasma", "Electric pulse. Invert + screen on a live body.", "#040818", "#66f0ff", {
    defaultRange: [0.08, 0.96],
    viscosity: 0.944,
    waveStrength: 1.06,
    cameraMix: 0.62,
    micDrive: 1.32,
    gyroDrive: 0.72,
    brushId: "pulse",
    brushFx: ["inversion", "screen"],
    brushFxOpacity: 0.86,
    colors: ["#02040c", "#040818", "#1a2060", "#3a3aff", "#c04aff", "#66f0ff"],
  }),
  fossil: world("fossil", "Fossil", "Slow amber. Copper nib, overlay + color on the feed.", "#1c1008", "#e8c078", {
    defaultRange: [0.04, 0.9],
    viscosity: 0.996,
    waveStrength: 0.2,
    cameraMix: 0.5,
    micDrive: 0.26,
    gyroDrive: 0.6,
    brushId: "copper",
    brushFx: ["overlay", "color"],
    brushFxOpacity: 0.84,
    colors: ["#0c0804", "#1c1008", "#5a3010", "#a86828", "#e8c078", "#fff0d0"],
  }),
  aurora: world("aurora", "Aurora", "Mist curtains. Screen + color, gyro drift, voice glow.", "#061418", "#b8ffd4", {
    defaultRange: [0.02, 0.98],
    viscosity: 0.976,
    waveStrength: 0.64,
    cameraMix: 0.7,
    micDrive: 0.74,
    gyroDrive: 0.98,
    brushId: "mist",
    brushFx: ["screen", "color"],
    brushFxOpacity: 0.76,
    colors: ["#040c14", "#061418", "#0a3a48", "#2a8a7a", "#7affc0", "#d8b8ff"],
  }),
  eclipse: world("eclipse", "Eclipse", "A dark sun. Invert + multiply, stamp the corona.", "#0a0614", "#ffd080", {
    defaultRange: [0.06, 0.94],
    viscosity: 0.97,
    waveStrength: 0.82,
    cameraMix: 0.9,
    micDrive: 0.58,
    gyroDrive: 0.5,
    brushId: "stamp",
    brushFx: ["inversion", "multiply"],
    brushFxOpacity: 0.9,
    colors: ["#040208", "#0a0614", "#3a1028", "#c04020", "#ffd080", "#fff4d8"],
    stops: mkStops("eclipse", [
      [0, "#040208", 0.85],
      [0.28, "#0a0614", 0.2],
      [0.5, "#3a1028", 0.15],
      [0.72, "#c04020", 0.65],
      [0.88, "#ffd080", 0.9],
      [1, "#fff4d8", 1],
    ]),
  }),
};

export function resolvePair(palette: Palette, override?: ColorPair | null): ColorPair {
  return {
    key: normalizeHex(override?.key ?? palette.key),
    shadow: normalizeHex(override?.shadow ?? palette.shadow),
  };
}

export function resolveColors(palette: Palette, override?: ColorPair | null): string[] {
  const pair = resolvePair(palette, override);
  if (pair.key === palette.key && pair.shadow === palette.shadow) {
    return palette.colors;
  }
  return rampFromPair(pair.shadow, pair.key);
}

export function paletteGradient(colors: string[]): string {
  if (colors.length === 0) return "transparent";
  if (colors.length === 1) return colors[0]!;
  const stops = colors.map((c, i) => `${c} ${(i / (colors.length - 1)) * 100}%`);
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

export function samplePalette(colors: string[], t: number): string {
  if (colors.length === 0) return "#000000";
  if (colors.length === 1) return colors[0]!;
  const x = Math.max(0, Math.min(1, t)) * (colors.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  if (i >= colors.length - 1) return colors[colors.length - 1]!;
  return lerpHex(colors[i]!, colors[i + 1]!, f);
}

export function normalizeHex(h: string): string {
  const s = h.replace("#", "").trim();
  if (s.length === 3) {
    return `#${s
      .split("")
      .map((c) => c + c)
      .join("")}`.toLowerCase();
  }
  if (s.length >= 6) return `#${s.slice(0, 6).toLowerCase()}`;
  return "#000000";
}

function lerpHex(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  return hexRgb(mixRgb(pa, pb, t));
}

function mixRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function hexRgb(rgb: [number, number, number]): string {
  const [r, g, b] = rgb;
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function parseHex(h: string): [number, number, number] {
  const s = normalizeHex(h).slice(1);
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Default 6 palette colors + 5 extras. */
export const MAX_COLOR_STOPS = 11;
export const MIN_COLOR_STOPS = 2;

let stopSeq = 0;
export function newStopId(): string {
  stopSeq += 1;
  return `s${Date.now().toString(36)}_${stopSeq}`;
}

export function stopsFromColors(colors: string[], idPrefix = "c"): ColorStop[] {
  if (colors.length === 0) return [{ id: `${idPrefix}-0`, t: 0, color: "#000000" }];
  if (colors.length === 1) return [{ id: `${idPrefix}-0`, t: 0, color: colors[0]! }];
  return colors.map((color, i) => ({
    id: `${idPrefix}-${i}`,
    t: i / (colors.length - 1),
    color,
  }));
}

export function sortStops(stops: ColorStop[]): ColorStop[] {
  return [...stops].sort((a, b) => a.t - b.t);
}

export function stopAlpha(stop: ColorStop): number {
  if (stop.alpha == null) return 1;
  return Math.max(0, Math.min(1, stop.alpha));
}

export function stopCss(stop: ColorStop): string {
  const a = stopAlpha(stop);
  if (a <= 0.001) return "rgba(0,0,0,0)";
  if (a >= 0.999) return stop.color;
  const [r, g, b] = parseHex(stop.color);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function gradientFromStops(stops: ColorStop[]): string {
  const sorted = sortStops(stops);
  if (sorted.length === 0) return "transparent";
  if (sorted.length === 1) return stopCss(sorted[0]!);
  const parts = sorted.map((s) => `${stopCss(s)} ${s.t * 100}%`);
  return `linear-gradient(90deg, ${parts.join(", ")})`;
}

export function sampleFromStops(stops: ColorStop[], t: number): string {
  const sorted = sortStops(stops);
  if (sorted.length === 0) return "#000000";
  if (sorted.length === 1) return sorted[0]!.color;
  const x = Math.max(0, Math.min(1, t));
  if (x <= sorted[0]!.t) return sorted[0]!.color;
  const last = sorted[sorted.length - 1]!;
  if (x >= last.t) return last.color;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    if (x >= a.t && x <= b.t) {
      const span = b.t - a.t;
      const f = span > 1e-6 ? (x - a.t) / span : 0;
      return lerpHex(a.color, b.color, f);
    }
  }
  return last.color;
}

export function resampleStops(stops: ColorStop[], count = 6): string[] {
  const sorted = sortStops(stops);
  if (sorted.length === 0) return Array.from({ length: count }, () => "#000000");
  if (count <= 1) return [sampleFromStops(sorted, 0.5)];
  return Array.from({ length: count }, (_, i) => sampleFromStops(sorted, i / (count - 1)));
}

export function addStop(stops: ColorStop[], color?: string, at?: number): ColorStop[] {
  const sorted = sortStops(stops);
  if (sorted.length >= MAX_COLOR_STOPS) return sorted;
  if (sorted.length === 0) {
    return [{ id: newStopId(), t: at ?? 0.5, color: color ?? "#ffffff" }];
  }
  if (at != null) {
    let t = Math.max(0, Math.min(1, at));
    while (sorted.some((s) => Math.abs(s.t - t) < 0.01)) t = Math.min(1, t + 0.012);
    const c = color ?? sampleFromStops(sorted, t);
    return sortStops([...sorted, { id: newStopId(), t, color: c }]);
  }
  if (sorted.length === 1) {
    const only = sorted[0]!;
    const t = only.t < 0.5 ? Math.min(1, only.t + 0.35) : Math.max(0, only.t - 0.35);
    return sortStops([only, { id: newStopId(), t, color: color ?? sampleFromStops(sorted, t) }]);
  }
  let bestI = 0;
  let bestGap = -1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1]!.t - sorted[i]!.t;
    if (gap > bestGap) {
      bestGap = gap;
      bestI = i;
    }
  }
  const a = sorted[bestI]!;
  const b = sorted[bestI + 1]!;
  const t = (a.t + b.t) / 2;
  const c = color ?? sampleFromStops(sorted, t);
  return sortStops([...sorted, { id: newStopId(), t, color: c }]);
}

export function removeStop(stops: ColorStop[], id: string): ColorStop[] {
  if (stops.length <= MIN_COLOR_STOPS) return stops;
  return sortStops(stops.filter((s) => s.id !== id));
}

export function updateStop(
  stops: ColorStop[],
  id: string,
  patch: Partial<Pick<ColorStop, "t" | "color" | "alpha">>,
): ColorStop[] {
  return sortStops(
    stops.map((s) =>
      s.id === id
        ? { ...s, ...patch, t: patch.t != null ? Math.max(0, Math.min(1, patch.t)) : s.t }
        : s,
    ),
  );
}

export function defaultStopsFor(palette: Palette, override?: ColorPair | null): ColorStop[] {
  if ((!override || (override.key === palette.key && override.shadow === palette.shadow)) && palette.stops?.length) {
    return palette.stops;
  }
  return stopsFromColors(resolveColors(palette, override), palette.id);
}

export function flipStops(stops: ColorStop[]): ColorStop[] {
  return stops
    .map((s) => ({ ...s, t: 1 - s.t }))
    .sort((a, b) => a.t - b.t);
}

export function snapshotBarCss(
  worldId: PaletteId,
  colorStops?: Partial<Record<PaletteId, ColorStop[]>> | null,
  flip = false,
): string {
  const p = PALETTES[worldId];
  const stops = colorStops?.[worldId] ?? p?.stops;
  let css: string;
  if (stops && stops.length > 0) {
    css = gradientFromStops(stops);
  } else if (p?.colors?.length) {
    css = `linear-gradient(90deg, ${p.colors.join(", ")})`;
  } else {
    css = "linear-gradient(90deg, #1a1a22, #8a8a96)";
  }
  if (flip) css = css.replace("90deg", "270deg");
  return css;
}
