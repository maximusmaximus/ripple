import type { BrushFxId, FxLayerId } from "@/lib/ripple/blend";
import { getBrush, type BrushId } from "@/lib/ripple/brushes";
import { PALETTES, PALETTE_ORDER, type PaletteId } from "@/lib/ripple/palettes";
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
  dia?: number;
  cam?: number;
  mic?: number;
  gyro?: number;
  zoom?: number;
  fxOp?: number;
  invert?: boolean;
  flip?: boolean;
  fit?: TextureFit;
  levels?: number;
  shadowColor?: string;
  shadowAngle?: number;
  shadowOpacity?: number;
};

/** 50 authored mixes. Each one stresses a different corner of the engine. */
const RECIPES: Recipe[] = [
  { id: EASY_PRESET_ID, name: "Easy", world: "lens", brush: "ink", texture: "none", fx: ["normal"], layers: ["brush"], vis: 0.96, wave: 0.7, dia: 0.04, cam: 0.85, mic: 0.4, gyro: 0.125, zoom: 0.55, fxOp: 0.7 },
  { id: "home_night_paper", name: "Night paper", world: "noir", brush: "quill", texture: "paper", fx: ["multiply"], layers: ["brush", "texture"], vis: 0.985, wave: 0.4 },
  { id: "home_silk_lens", name: "Silk lens", world: "lens", brush: "wash", texture: "silk", fx: ["multiply", "color"], layers: ["brush", "texture", "camera"], cam: 1, fxOp: 0.78 },
  { id: "home_ember_wash", name: "Ember wash", world: "ember", brush: "sable", texture: "canvas", fx: ["overlay"], layers: ["brush", "texture"], wave: 0.95, vis: 0.94 },
  { id: "home_volt_mesh", name: "Volt mesh", world: "volt", brush: "spark", texture: "mesh", fx: ["screen"], layers: ["brush", "texture"], wave: 1.2, gyro: 0.4 },
  { id: "home_halo_foam", name: "Halo foam", world: "halo", brush: "cloud", texture: "foam", fx: ["lighten", "overlay"], layers: ["brush", "texture"], vis: 0.93, wave: 1.1 },
  { id: "home_tide_silk", name: "Tide silk", world: "tide", brush: "ribbon", texture: "silk", fx: ["color"], layers: ["brush", "texture"], vis: 0.988, wave: 0.55 },
  { id: "home_magma_grain", name: "Magma grain", world: "magma", brush: "grit", texture: "grain", fx: ["multiply", "contrast"], layers: ["brush", "texture"], wave: 1.15, invert: false },
  { id: "home_ghost_hatch", name: "Ghost hatch", world: "ghost", brush: "hair", texture: "hatch", fx: ["inversion"], layers: ["brush", "texture"], vis: 0.97, cam: 0.55 },
  { id: "home_riot_spray", name: "Riot spray", world: "riot", brush: "spray", texture: "none", fx: ["overlay", "color"], layers: ["brush"], wave: 1.35, mic: 1.1 },
  { id: "home_noir_quill", name: "Noir quill", world: "noir", brush: "italic", texture: "paper", fx: ["multiply"], layers: ["brush", "shadow"], shadowAngle: 118, shadowOpacity: 0.62 },
  { id: "home_plasma_scan", name: "Plasma scan", world: "plasma", brush: "needle", texture: "scan", fx: ["screen", "contrast"], layers: ["brush", "texture"], wave: 0.88 },
  { id: "home_aurora_veil", name: "Aurora veil", world: "aurora", brush: "mist", texture: "caustic", fx: ["lighten", "color"], layers: ["brush", "texture", "camera"], cam: 0.9 },
  { id: "home_eclipse_stamp", name: "Eclipse stamp", world: "eclipse", brush: "stamp", texture: "marble", fx: ["darken"], layers: ["brush", "texture", "shadow"], dia: 0.1, shadowOpacity: 0.7 },
  { id: "home_storm_grit", name: "Storm grit", world: "storm", brush: "grit", texture: "grain", fx: ["overlay"], layers: ["brush", "texture", "mic"], mic: 1.2, wave: 1.4 },
  { id: "home_inkwell_needle", name: "Inkwell needle", world: "inkwell", brush: "needle", texture: "paper", fx: ["multiply"], layers: ["brush"], vis: 0.995, wave: 0.22, dia: 0.02 },
  { id: "home_fossil_marble", name: "Fossil marble", world: "fossil", brush: "pebble", texture: "marble", fx: ["multiply", "color"], layers: ["brush", "texture"], vis: 0.982 },
  { id: "home_prism_ribbon", name: "Prism ribbon", world: "prism", brush: "ribbon", texture: "silk", fx: ["component"], layers: ["brush", "texture"], fxOp: 0.85 },
  { id: "home_voice_cloud", name: "Voice cloud", world: "voice", brush: "cloud", texture: "none", fx: ["overlay"], layers: ["brush", "mic"], mic: 1.42, wave: 0.9 },
  { id: "home_slosh_flood", name: "Slosh flood", world: "slosh", brush: "flood", texture: "foam", fx: ["normal"], layers: ["brush", "texture"], gyro: 0.55, zoom: 1.1, wave: 1.45 },
  { id: "home_mirror_soft", name: "Mirror soft", world: "mirror", brush: "soft", texture: "silk", fx: ["screen"], layers: ["brush", "camera", "texture"], cam: 1 },
  { id: "home_gel_pulse", name: "Gel pulse", world: "gel", brush: "pulse", texture: "caustic", fx: ["overlay"], layers: ["brush", "texture"], vis: 0.91, wave: 0.8 },
  { id: "home_camera_stain", name: "Camera stain", world: "lens", brush: "ink", texture: "none", fx: ["multiply", "color"], layers: ["brush", "camera"], cam: 1, fxOp: 0.82 },
  { id: "home_mic_bloom", name: "Mic bloom", world: "voice", brush: "pulse", texture: "foam", fx: ["screen"], layers: ["brush", "mic", "texture"], mic: 1.5, wave: 1.05 },
  { id: "home_gyro_tilt", name: "Gyro tilt", world: "slosh", brush: "wash", texture: "weave", fx: ["normal"], layers: ["brush", "texture"], gyro: 0.7, zoom: 1.25, vis: 0.92 },
  { id: "home_wet_silk", name: "Wet silk", world: "tide", brush: "sable", texture: "silk", fx: ["multiply"], layers: ["brush", "texture"], vis: 0.9, wave: 0.7 },
  { id: "home_dry_hatch", name: "Dry hatch", world: "fossil", brush: "dart", texture: "hatch", fx: ["darken"], layers: ["brush", "texture"], vis: 0.997, wave: 0.18 },
  { id: "home_projector", name: "Projector", world: "halo", brush: "wash", texture: "none", fx: ["screen"], layers: ["brush", "camera"], cam: 1, fxOp: 0.9 },
  { id: "home_difference", name: "Difference", world: "ghost", brush: "bold", texture: "scan", fx: ["inversion"], layers: ["brush", "texture", "camera"], cam: 0.75 },
  { id: "home_hard_light", name: "Hard light", world: "volt", brush: "pebble", texture: "mesh", fx: ["contrast"], layers: ["brush", "texture"], fxOp: 0.88 },
  { id: "home_color_grade", name: "Color grade", world: "prism", brush: "ink", texture: "none", fx: ["color"], layers: ["brush", "camera"], cam: 0.92 },
  { id: "home_hairline", name: "Hairline", world: "noir", brush: "hair", texture: "paper", fx: ["multiply"], layers: ["brush"], dia: 0.014, vis: 0.993, wave: 0.25 },
  { id: "home_bold_wash", name: "Bold wash", world: "ember", brush: "stamp", texture: "canvas", fx: ["multiply", "overlay"], layers: ["brush", "texture"], dia: 0.11, wave: 0.85 },
  { id: "home_copperplate", name: "Copperplate", world: "inkwell", brush: "copper", texture: "paper", fx: ["multiply"], layers: ["brush", "shadow"], shadowAngle: 155, shadowOpacity: 0.55 },
  { id: "home_brushpen_night", name: "Brushpen night", world: "eclipse", brush: "brushpen", texture: "none", fx: ["darken"], layers: ["brush"], vis: 0.978 },
  { id: "home_foam_crest", name: "Foam crest", world: "tide", brush: "cloud", texture: "foam", fx: ["lighten"], layers: ["brush", "texture"], wave: 1.28, vis: 0.935 },
  { id: "home_caustic_tide", name: "Caustic tide", world: "aurora", brush: "flood", texture: "caustic", fx: ["screen", "color"], layers: ["brush", "texture"], wave: 1.18 },
  { id: "home_weave_ink", name: "Weave ink", world: "inkwell", brush: "ink", texture: "weave", fx: ["multiply"], layers: ["brush", "texture"], vis: 0.986 },
  { id: "home_paper_ember", name: "Paper ember", world: "ember", brush: "taper", texture: "paper", fx: ["overlay"], layers: ["brush", "texture", "shadow"], shadowColor: "#1a0804", shadowOpacity: 0.5 },
  { id: "home_scan_storm", name: "Scan storm", world: "storm", brush: "spark", texture: "scan", fx: ["contrast", "screen"], layers: ["brush", "texture", "mic"], mic: 1.05 },
  { id: "home_mesh_volt", name: "Mesh volt", world: "volt", brush: "dart", texture: "mesh", fx: ["overlay"], layers: ["brush", "texture"], gyro: 0.35, wave: 1.0 },
  { id: "home_marble_fossil", name: "Marble fossil", world: "fossil", brush: "swell", texture: "marble", fx: ["multiply"], layers: ["brush", "texture"], vis: 0.975, levels: 0.15 },
  { id: "home_mist_ghost", name: "Mist ghost", world: "ghost", brush: "mist", texture: "grain", fx: ["lighten", "inversion"], layers: ["brush", "texture"], fxOp: 0.64, invert: true },
  { id: "home_spark_riot", name: "Spark riot", world: "riot", brush: "spark", texture: "none", fx: ["screen", "contrast"], layers: ["brush"], wave: 1.42, dia: 0.028 },
  { id: "home_sable_halo", name: "Sable halo", world: "halo", brush: "sable", texture: "silk", fx: ["color", "overlay"], layers: ["brush", "texture", "camera"], cam: 0.88 },
  { id: "home_taper_noir", name: "Taper noir", world: "noir", brush: "taper", texture: "none", fx: ["multiply"], layers: ["brush", "shadow"], shadowAngle: 210, shadowOpacity: 0.48 },
  { id: "home_swell_magma", name: "Swell magma", world: "magma", brush: "swell", texture: "canvas", fx: ["overlay", "multiply"], layers: ["brush", "texture"], wave: 1.22 },
  { id: "home_italic_tide", name: "Italic tide", world: "tide", brush: "italic", texture: "silk", fx: ["multiply", "color"], layers: ["brush", "texture"], vis: 0.984 },
  { id: "home_component_prism", name: "Component", world: "prism", brush: "bold", texture: "scan", fx: ["component", "contrast"], layers: ["brush", "texture", "camera"], cam: 0.7, fxOp: 0.8 },
  { id: "home_shadow_ember", name: "Shadow ember", world: "ember", brush: "pebble", texture: "grain", fx: ["multiply"], layers: ["brush", "shadow", "texture"], shadowAngle: 125, shadowOpacity: 0.78, shadowColor: "#140804", flip: true },
];

function paletteRecipe(id: PaletteId): Recipe {
  const p = PALETTES[id] ?? PALETTES.lens;
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
  };
}

function snapshotFrom(r: Recipe): StudioSnapshot {
  const p = PALETTES[r.world] ?? PALETTES.lens;
  const brush = getBrush(r.brush);
  const layers = r.layers;
  const shadowOn = layers.includes("shadow");
  return {
    worldId: r.world,
    colorRanges: {},
    colorPairs: {},
    colorStops: {},
    viscosity: r.vis ?? p.viscosity,
    waveStrength: r.wave ?? p.waveStrength,
    brushDiameter: r.dia ?? Math.max(0.01, Math.min(0.12, brush.radius * 2)),
    brushId: r.brush,
    brushFx: { [r.brush]: r.fx },
    brushFxOpacity: r.fxOp ?? p.brushFxOpacity,
    fxLayers: layers,
    shadowOn,
    shadowColor: r.shadowColor ?? "#0a0810",
    shadowAngle: r.shadowAngle ?? 135,
    shadowOpacity: r.shadowOpacity ?? 0.45,
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
