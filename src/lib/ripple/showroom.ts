import type { BrushFxId, FxLayerId } from "@/lib/ripple/blend";
import {
  defaultBrushSpan,
  defaultShapeFor,
  getBrush,
  type BrushId,
  type BrushShape,
  type BrushSpan,
} from "@/lib/ripple/brushes";
import {
  BRUSH_SHADOW_STOP_ID,
  PALETTES,
  PALETTE_ORDER,
  type ColorStop,
  type PaletteId,
} from "@/lib/ripple/palettes";
import type { TextureId } from "@/lib/ripple/textures";
import { EASY_PRESET_ID, type NamedPreset, type StudioSnapshot, type TextureFit } from "@/lib/ripple/studio";

type Recipe = {
  id: string;
  name: string;
  world: PaletteId;
  brush: BrushId;
  texture: TextureId;
  fx: BrushFxId[];
  layers: FxLayerId[];
  vis?: number;
  wave?: number;
  cam?: number;
  mic?: number;
  gyro?: number;
  zoom?: number;
  fxOp?: number;
  invert?: boolean;
  flip?: boolean;
  fit?: TextureFit;
  levels?: number;
  span?: BrushSpan;
  shape?: Partial<BrushShape>;
  stops?: ColorStop[];
  shadowColor?: string;
  shadowAngle?: number;
  shadowOpacity?: number;
  shadowDist?: number;
  shadowSpan?: BrushSpan;
};

function ink(
  id: string,
  parts: Array<[number, string, number?]>,
  shadow?: { color: string; alpha: number; t?: number },
): ColorStop[] {
  const stops: ColorStop[] = parts.map((p, i) => ({
    id: `${id}_${i}`,
    t: p[0],
    color: p[1],
    alpha: p[2] ?? 1,
  }));
  if (shadow) {
    stops.push({
      id: BRUSH_SHADOW_STOP_ID,
      t: shadow.t ?? 0.05,
      color: shadow.color,
      alpha: shadow.alpha,
      role: "shadow",
    });
  }
  return stops;
}

/**
 * Curated demo reel. Easy + the twenty worlds stay first; the mixes after
 * that each turn on a different corner of the engine (width envelope, color
 * along the stroke, blade, shadow, sensors, texture).
 */
const RECIPES: Recipe[] = [
  {
    id: EASY_PRESET_ID,
    name: "Easy",
    world: "lens",
    brush: "ink",
    texture: "none",
    fx: ["normal"],
    layers: ["brush"],
    vis: 0.96,
    wave: 0.7,
    cam: 0.85,
    mic: 0.4,
    gyro: 0.125,
    zoom: 0.55,
    fxOp: 0.7,
    span: { start: 0.052, mid: 0.036, end: 0.018 },
    shape: { angle: 0, width: 1, spin: 0 },
    stops: ink("easy", [
      [0, "#03080e", 0.9],
      [0.35, "#1a4a5c"],
      [0.7, "#7ec8d8"],
      [1, "#d7f6ff"],
    ]),
  },
  {
    id: "home_night_paper",
    name: "Night paper",
    world: "noir",
    brush: "quill",
    texture: "paper",
    fx: ["multiply"],
    layers: ["brush", "texture", "shadow"],
    vis: 0.988,
    wave: 0.38,
    span: { start: 0.058, mid: 0.028, end: 0.01 },
    shape: { angle: 45, width: 0.28, spin: 0 },
    shadowAngle: 118,
    shadowDist: 0.28,
    shadowSpan: { start: 0.04, mid: 0.02, end: 0.01 },
    stops: ink(
      "night",
      [
        [0, "#07060a"],
        [0.45, "#2a2830"],
        [0.78, "#8a8694"],
        [1, "#e8e6f0", 0.7],
      ],
      { color: "#05040a", alpha: 0.62 },
    ),
  },
  {
    id: "home_copperplate",
    name: "Copperplate",
    world: "inkwell",
    brush: "copper",
    texture: "paper",
    fx: ["multiply"],
    layers: ["brush", "shadow"],
    vis: 0.992,
    wave: 0.28,
    span: { start: 0.05, mid: 0.026, end: 0.009 },
    shape: { angle: 55, width: 0.24, spin: 0 },
    shadowAngle: 155,
    shadowDist: 0.4,
    shadowSpan: { start: 0.048, mid: 0.024, end: 0.01 },
    stops: ink(
      "copper",
      [
        [0, "#1a1008"],
        [0.4, "#5a3218"],
        [0.75, "#c4a078"],
        [1, "#f0e4d0", 0.55],
      ],
      { color: "#120804", alpha: 0.55 },
    ),
  },
  {
    id: "home_taper_noir",
    name: "Taper noir",
    world: "noir",
    brush: "taper",
    texture: "none",
    fx: ["multiply"],
    layers: ["brush", "shadow"],
    vis: 0.986,
    wave: 0.32,
    span: { start: 0.09, mid: 0.034, end: 0.008 },
    shape: { angle: 8, width: 0.38, spin: 0 },
    shadowAngle: 210,
    shadowDist: 0.32,
    shadowSpan: { start: 0.07, mid: 0.03, end: 0.01 },
    stops: ink(
      "taper",
      [
        [0, "#0c0a12"],
        [0.5, "#3a3848"],
        [0.82, "#9a96a8", 0.65],
        [1, "#e8e6f2", 0.15],
      ],
      { color: "#08060c", alpha: 0.48 },
    ),
  },
  {
    id: "home_shadow_ember",
    name: "Shadow ember",
    world: "ember",
    brush: "pebble",
    texture: "grain",
    fx: ["multiply"],
    layers: ["brush", "shadow", "texture"],
    vis: 0.97,
    wave: 0.88,
    flip: true,
    span: { start: 0.1, mid: 0.078, end: 0.042 },
    shape: { angle: 0, width: 1, spin: 0 },
    shadowAngle: 125,
    shadowDist: 0.62,
    shadowSpan: { start: 0.11, mid: 0.082, end: 0.048 },
    stops: ink(
      "shember",
      [
        [0, "#fff0c4"],
        [0.28, "#ffb020"],
        [0.62, "#e85d04"],
        [1, "#2a0600"],
      ],
      { color: "#140804", alpha: 0.78, t: 0.08 },
    ),
  },
  {
    id: "home_eclipse_stamp",
    name: "Eclipse stamp",
    world: "eclipse",
    brush: "stamp",
    texture: "marble",
    fx: ["darken"],
    layers: ["brush", "texture", "shadow"],
    vis: 0.978,
    wave: 0.55,
    span: { start: 0.12, mid: 0.108, end: 0.09 },
    shape: { angle: 0, width: 1, spin: 0 },
    shadowAngle: 140,
    shadowDist: 0.52,
    shadowSpan: { start: 0.12, mid: 0.1, end: 0.086 },
    stops: ink(
      "eclipse",
      [
        [0, "#0a0610"],
        [0.4, "#3a1848"],
        [0.75, "#c89040"],
        [1, "#f4e8c8"],
      ],
      { color: "#08040c", alpha: 0.7 },
    ),
  },
  {
    id: "home_silk_ribbon",
    name: "Silk ribbon",
    world: "tide",
    brush: "ribbon",
    texture: "silk",
    fx: ["color"],
    layers: ["brush", "texture"],
    vis: 0.988,
    wave: 0.52,
    span: { start: 0.07, mid: 0.048, end: 0.022 },
    shape: { angle: 22, width: 0.36, spin: 0 },
    stops: ink("silk", [
      [0, "#041820"],
      [0.32, "#0a4a58"],
      [0.62, "#3ec8d0"],
      [1, "#e8ffff"],
    ]),
  },
  {
    id: "home_brushpen_night",
    name: "Brushpen night",
    world: "eclipse",
    brush: "brushpen",
    texture: "none",
    fx: ["darken"],
    layers: ["brush", "shadow"],
    vis: 0.978,
    wave: 0.48,
    span: { start: 0.022, mid: 0.072, end: 0.028 },
    shape: { angle: 18, width: 0.5, spin: 0 },
    shadowAngle: 200,
    shadowDist: 0.36,
    shadowSpan: { start: 0.03, mid: 0.06, end: 0.022 },
    stops: ink(
      "brushpen",
      [
        [0, "#120816"],
        [0.4, "#5a2048"],
        [0.78, "#d09050"],
        [1, "#f8ecc8", 0.8],
      ],
      { color: "#0a0610", alpha: 0.5 },
    ),
  },
  {
    id: "home_halo_foam",
    name: "Halo foam",
    world: "halo",
    brush: "cloud",
    texture: "foam",
    fx: ["lighten", "overlay"],
    layers: ["brush", "texture"],
    vis: 0.93,
    wave: 1.1,
    span: { start: 0.11, mid: 0.086, end: 0.05 },
    shape: { angle: 8, width: 1, spin: 0.35 },
    stops: ink("halo", [
      [0, "#fff8e8", 0.35],
      [0.4, "#ffe8a0", 0.7],
      [0.75, "#f0c060"],
      [1, "#ffffff"],
    ]),
  },
  {
    id: "home_voice_cloud",
    name: "Voice bloom",
    world: "voice",
    brush: "pulse",
    texture: "none",
    fx: ["overlay"],
    layers: ["brush", "mic"],
    vis: 0.96,
    wave: 0.9,
    mic: 1.42,
    span: { start: 0.04, mid: 0.07, end: 0.03 },
    shape: { angle: 0, width: 0.7, spin: 1.2 },
    stops: ink("voice", [
      [0, "#1a0524"],
      [0.4, "#c43adf"],
      [0.72, "#ff4fd8"],
      [1, "#ffe8ff"],
    ]),
  },
  {
    id: "home_slosh_flood",
    name: "Gyro flood",
    world: "slosh",
    brush: "flood",
    texture: "foam",
    fx: ["normal"],
    layers: ["brush", "texture"],
    vis: 0.92,
    wave: 1.45,
    gyro: 0.7,
    zoom: 1.15,
    span: { start: 0.12, mid: 0.09, end: 0.055 },
    shape: { angle: 0, width: 0.88, spin: 0 },
    stops: ink("gyro", [
      [0, "#101820"],
      [0.45, "#5a7a90"],
      [0.8, "#8ab4c8"],
      [1, "#e4f0f6"],
    ]),
  },
  {
    id: "home_camera_stain",
    name: "Camera stain",
    world: "lens",
    brush: "ink",
    texture: "none",
    fx: ["multiply", "color"],
    layers: ["brush", "camera"],
    vis: 0.99,
    wave: 0.36,
    cam: 1,
    fxOp: 0.82,
    span: { start: 0.06, mid: 0.04, end: 0.02 },
    shape: { angle: 0, width: 1, spin: 0 },
    stops: ink("cam", [
      [0, "#03080e", 0.4],
      [0.3, "#07141f", 0.3],
      [0.62, "#7ec8d8", 0.65],
      [1, "#ffffff", 0.9],
    ]),
  },
  {
    id: "home_aurora_veil",
    name: "Aurora veil",
    world: "aurora",
    brush: "mist",
    texture: "caustic",
    fx: ["lighten", "color"],
    layers: ["brush", "texture", "camera"],
    vis: 0.95,
    wave: 0.85,
    cam: 0.9,
    span: { start: 0.1, mid: 0.07, end: 0.04 },
    shape: { angle: 0, width: 1, spin: 0.4 },
    stops: ink("aurora", [
      [0, "#041428", 0.45],
      [0.32, "#0a8a5a", 0.7],
      [0.62, "#40e0d0"],
      [1, "#e070ff", 0.85],
    ]),
  },
  {
    id: "home_swell_magma",
    name: "Magma swell",
    world: "magma",
    brush: "swell",
    texture: "canvas",
    fx: ["overlay", "multiply"],
    layers: ["brush", "texture"],
    vis: 0.96,
    wave: 1.22,
    span: { start: 0.018, mid: 0.095, end: 0.03 },
    shape: { angle: 352, width: 0.48, spin: 0 },
    stops: ink("magma", [
      [0, "#1a0600"],
      [0.35, "#8b1a00"],
      [0.68, "#e85d04"],
      [1, "#ffb020"],
    ]),
  },
  {
    id: "home_ghost_hatch",
    name: "Ghost inversion",
    world: "ghost",
    brush: "bold",
    texture: "hatch",
    fx: ["inversion"],
    layers: ["brush", "texture", "camera"],
    vis: 0.97,
    wave: 0.55,
    cam: 0.7,
    fxOp: 0.72,
    span: { start: 0.08, mid: 0.055, end: 0.028 },
    shape: { angle: 0, width: 0.92, spin: 0 },
    invert: true,
    stops: ink("ghost", [
      [0, "#e8e6f0"],
      [0.4, "#8a8698"],
      [0.75, "#2a2838"],
      [1, "#08080c"],
    ]),
  },
  {
    id: "home_prism_ribbon",
    name: "Prism blade",
    world: "prism",
    brush: "ribbon",
    texture: "silk",
    fx: ["component"],
    layers: ["brush", "texture"],
    vis: 0.98,
    wave: 0.6,
    fxOp: 0.85,
    span: { start: 0.074, mid: 0.046, end: 0.02 },
    shape: { angle: 28, width: 0.32, spin: 0 },
    stops: ink("prism", [
      [0, "#3a10a0"],
      [0.28, "#2080ff"],
      [0.55, "#20e090"],
      [0.78, "#f0d020"],
      [1, "#f04080"],
    ]),
  },
  {
    id: "home_hairline",
    name: "Hairline",
    world: "noir",
    brush: "hair",
    texture: "paper",
    fx: ["multiply"],
    layers: ["brush"],
    vis: 0.995,
    wave: 0.22,
    span: { start: 0.014, mid: 0.01, end: 0.008 },
    shape: { angle: 0, width: 0.32, spin: 0 },
    stops: ink("hair", [
      [0, "#0a0810"],
      [0.55, "#2a2830"],
      [1, "#6a6678", 0.7],
    ]),
  },
  {
    id: "home_plasma_scan",
    name: "Plasma needle",
    world: "plasma",
    brush: "needle",
    texture: "scan",
    fx: ["screen", "contrast"],
    layers: ["brush", "texture"],
    vis: 0.97,
    wave: 0.88,
    span: { start: 0.02, mid: 0.014, end: 0.009 },
    shape: { angle: 0, width: 0.4, spin: 0 },
    stops: ink("plasma", [
      [0, "#040818"],
      [0.4, "#1040c0"],
      [0.75, "#40e8ff"],
      [1, "#f0ffff"],
    ]),
  },
  {
    id: "home_wet_silk",
    name: "Wet silk",
    world: "tide",
    brush: "sable",
    texture: "silk",
    fx: ["multiply"],
    layers: ["brush", "texture"],
    vis: 0.9,
    wave: 0.7,
    span: { start: 0.03, mid: 0.08, end: 0.04 },
    shape: { angle: 12, width: 0.62, spin: 0 },
    stops: ink("wet", [
      [0, "#041820", 0.85],
      [0.4, "#0a6a78"],
      [0.75, "#70d8e0"],
      [1, "#e8ffff", 0.6],
    ]),
  },
  {
    id: "home_scan_storm",
    name: "Scan storm",
    world: "storm",
    brush: "spark",
    texture: "scan",
    fx: ["contrast", "screen"],
    layers: ["brush", "texture", "mic"],
    vis: 0.95,
    wave: 1.2,
    mic: 1.05,
    span: { start: 0.028, mid: 0.018, end: 0.012 },
    shape: { angle: 0, width: 0.55, spin: 0 },
    stops: ink("storm", [
      [0, "#0a1018"],
      [0.4, "#3a6088"],
      [0.75, "#a0d0f0"],
      [1, "#f0f8ff"],
    ]),
  },
  {
    id: "home_italic_tide",
    name: "Italic tide",
    world: "tide",
    brush: "italic",
    texture: "silk",
    fx: ["multiply", "color"],
    layers: ["brush", "texture", "shadow"],
    vis: 0.984,
    wave: 0.48,
    span: { start: 0.054, mid: 0.03, end: 0.012 },
    shape: { angle: 30, width: 0.34, spin: 0 },
    shadowAngle: 110,
    shadowDist: 0.3,
    shadowSpan: { start: 0.04, mid: 0.02, end: 0.01 },
    stops: ink(
      "italic",
      [
        [0, "#041820"],
        [0.45, "#1a6878"],
        [0.8, "#90e0e8"],
        [1, "#f0ffff", 0.5],
      ],
      { color: "#021018", alpha: 0.5 },
    ),
  },
  {
    id: "home_riot_spray",
    name: "Riot spray",
    world: "riot",
    brush: "spray",
    texture: "none",
    fx: ["overlay", "color"],
    layers: ["brush"],
    vis: 0.95,
    wave: 1.35,
    mic: 1.1,
    span: { start: 0.07, mid: 0.05, end: 0.03 },
    shape: { angle: 0, width: 1, spin: 0 },
    stops: ink("riot", [
      [0, "#1a0410"],
      [0.3, "#e01040"],
      [0.62, "#ff8030"],
      [1, "#ffe060"],
    ]),
  },
  {
    id: "home_projector",
    name: "Projector",
    world: "halo",
    brush: "wash",
    texture: "none",
    fx: ["screen"],
    layers: ["brush", "camera"],
    vis: 0.97,
    wave: 0.5,
    cam: 1,
    fxOp: 0.9,
    span: { start: 0.1, mid: 0.072, end: 0.04 },
    shape: { angle: 0, width: 0.82, spin: 0 },
    stops: ink("proj", [
      [0, "#fff8e0", 0.25],
      [0.45, "#ffe090", 0.55],
      [1, "#ffffff", 0.85],
    ]),
  },
  {
    id: "home_hard_light",
    name: "Hard light",
    world: "volt",
    brush: "pebble",
    texture: "mesh",
    fx: ["contrast"],
    layers: ["brush", "texture"],
    vis: 0.96,
    wave: 0.85,
    fxOp: 0.88,
    gyro: 0.35,
    span: { start: 0.08, mid: 0.055, end: 0.03 },
    shape: { angle: 0, width: 1, spin: 0 },
    stops: ink("hard", [
      [0, "#041018"],
      [0.4, "#08c0e0"],
      [0.75, "#e0ff40"],
      [1, "#ffffff"],
    ]),
  },
];

function paletteRecipe(id: PaletteId): Recipe {
  const p = PALETTES[id] ?? PALETTES.lens;
  const brush = getBrush(p.brushId);
  return {
    id: `home_world_${id}`,
    name: p.name,
    world: id,
    brush: p.brushId,
    texture: "none",
    fx: p.brushFx,
    layers: ["brush"],
    vis: p.viscosity,
    wave: p.waveStrength,
    cam: p.cameraMix,
    mic: p.micDrive,
    gyro: p.gyroDrive,
    fxOp: p.brushFxOpacity,
    span: defaultBrushSpan(brush.radius),
    shape: defaultShapeFor(brush),
    stops: p.stops,
  };
}

function snapshotFrom(r: Recipe): StudioSnapshot {
  const p = PALETTES[r.world] ?? PALETTES.lens;
  const brush = getBrush(r.brush);
  const layers = r.layers;
  const shadowOn = layers.includes("shadow");
  const span = r.span ?? defaultBrushSpan(brush.radius);
  const shape = { ...defaultShapeFor(brush), ...r.shape };
  const shadowStop = r.stops?.find((s) => s.role === "shadow" || s.id === BRUSH_SHADOW_STOP_ID);
  return {
    worldId: r.world,
    colorRanges: { [r.world]: { start: 0, end: 1 } },
    colorPairs: {},
    colorStops: r.stops ? { [r.world]: r.stops } : {},
    viscosity: r.vis ?? p.viscosity,
    waveStrength: r.wave ?? p.waveStrength,
    brushDiameter: span.start,
    brushSpan: { [r.brush]: span },
    brushShape: { [r.brush]: shape },
    brushId: r.brush,
    brushFx: { [r.brush]: r.fx },
    brushFxOpacity: r.fxOp ?? p.brushFxOpacity,
    fxLayers: layers,
    shadowOn,
    shadowColor: r.shadowColor ?? shadowStop?.color ?? "#0a0810",
    shadowAngle: r.shadowAngle ?? 135,
    shadowOpacity: r.shadowOpacity ?? shadowStop?.alpha ?? 0.45,
    shadowDist: r.shadowDist ?? 0.35,
    shadowSpan: r.shadowSpan ?? { start: 0.072, mid: 0.048, end: 0.022 },
    textureId: r.texture,
    textureFit: r.fit ?? "cover",
    customTexture: null,
    textureLevels: r.levels ?? 0,
    textureInvert: Boolean(r.invert),
    gradientFlip: Boolean(r.flip),
    cameraInteract: r.cam ?? p.cameraMix,
    micSensitivity: r.mic ?? p.micDrive,
    gyroSensitivity: r.gyro ?? p.gyroDrive,
    gyroZoom: r.zoom ?? 0.55,
    customBrushes: [],
  };
}

export function builtinPresets(): NamedPreset[] {
  const asPreset = (r: Recipe): NamedPreset => ({
    id: r.id,
    name: r.name,
    createdAt: "2026-08-25T12:00:00.000Z",
    source: "homebase" as const,
    snapshot: snapshotFrom(r),
  });
  const easy = RECIPES[0] ? [asPreset(RECIPES[0])] : [];
  const palettes = PALETTE_ORDER.map((id) => asPreset(paletteRecipe(id)));
  const mixes = RECIPES.slice(1).map(asPreset);
  return [...easy, ...palettes, ...mixes];
}

export function isBuiltinPresetId(id: string): boolean {
  return id === EASY_PRESET_ID || id.startsWith("home_");
}

export function builtinNames(): string[] {
  return builtinPresets().map((p) => p.name);
}

export function builtinFile() {
  return {
    version: 2,
    note: "Built-in presets plus studio saves. Images live in /studio/media.",
    presets: builtinPresets(),
  };
}
