export type TextureId =
  | "none"
  | "paper"
  | "silk"
  | "canvas"
  | "grain"
  | "marble"
  | "weave"
  | "caustic"
  | "mesh"
  | "hatch"
  | "foam"
  | "scan"
  | "custom";

export type CanvasTexture = {
  id: TextureId;
  name: string;
  code: number;
  hint: string;
  preview: string;
};

export const TEXTURES: CanvasTexture[] = [
  {
    id: "none",
    name: "None",
    code: 0,
    hint: "Bare fluid — no medium grain.",
    preview: "linear-gradient(145deg, #2a2a30, #121216)",
  },
  {
    id: "paper",
    name: "Paper",
    code: 1,
    hint: "Pressed pulp. Ink catches in the tooth.",
    preview:
      "repeating-radial-gradient(circle at 20% 30%, rgba(255,255,255,.14) 0 0.6px, transparent 0.8px 3px), repeating-linear-gradient(12deg, rgba(0,0,0,.12) 0 1px, transparent 1px 3px), linear-gradient(160deg, #d8cbb8, #8a7a66)",
  },
  {
    id: "silk",
    name: "Silk",
    code: 2,
    hint: "Anisotropic slide. Strokes drift with the warp.",
    preview:
      "repeating-linear-gradient(90deg, transparent 0 2px, rgba(255,255,255,.18) 2px 3px), linear-gradient(180deg, #5a3a58, #c9a8c4 40%, #3a2038 70%, #e8d4e6)",
  },
  {
    id: "canvas",
    name: "Canvas",
    code: 3,
    hint: "Linen criss-cross. Paint sits in the weave.",
    preview:
      "repeating-linear-gradient(0deg, rgba(255,255,255,.2) 0 1px, transparent 1px 4px), repeating-linear-gradient(90deg, rgba(0,0,0,.18) 0 1px, transparent 1px 4px), linear-gradient(#c4b090, #6e5a3c)",
  },
  {
    id: "grain",
    name: "Grain",
    code: 4,
    hint: "Film pepper. Flickers with the clock.",
    preview:
      "repeating-radial-gradient(circle at 0 0, #fff 0 0.5px, transparent 0.6px 2.4px), repeating-radial-gradient(circle at 70% 40%, #000 0 0.4px, transparent 0.5px 2.8px), linear-gradient(#3a3a3e, #111114)",
  },
  {
    id: "marble",
    name: "Marble",
    code: 5,
    hint: "Veins steer the flow. Soft, heavy mass.",
    preview:
      "radial-gradient(ellipse at 20% 30%, #f2ece4 0 18%, transparent 42%), radial-gradient(ellipse at 80% 70%, #c8b8a8 0 22%, transparent 50%), repeating-linear-gradient(118deg, transparent 0 8px, rgba(80,60,50,.35) 9px 10px), linear-gradient(140deg, #e8ddd0, #8a7a70)",
  },
  {
    id: "weave",
    name: "Weave",
    code: 6,
    hint: "Basket grain. Ink prefers the troughs.",
    preview:
      "repeating-linear-gradient(0deg, #4a3020 0 3px, #c9a078 3px 6px), repeating-linear-gradient(90deg, rgba(0,0,0,.35) 0 3px, transparent 3px 6px)",
  },
  {
    id: "caustic",
    name: "Caustic",
    code: 7,
    hint: "Living light on water. Crests bloom.",
    preview:
      "radial-gradient(ellipse at 30% 40%, rgba(180,255,255,.7) 0 12%, transparent 38%), radial-gradient(ellipse at 70% 60%, rgba(80,200,255,.55) 0 16%, transparent 44%), radial-gradient(ellipse at 50% 20%, rgba(255,255,255,.4) 0 8%, transparent 28%), linear-gradient(#083048, #021018)",
  },
  {
    id: "mesh",
    name: "Mesh",
    code: 8,
    hint: "A grid that pulses. Strokes quantize to the wire.",
    preview:
      "repeating-linear-gradient(0deg, rgba(160,255,200,.55) 0 1px, transparent 1px 7px), repeating-linear-gradient(90deg, rgba(160,255,200,.45) 0 1px, transparent 1px 7px), linear-gradient(#102018, #050a08)",
  },
  {
    id: "hatch",
    name: "Hatch",
    code: 9,
    hint: "Cross-hatch. Density writes the form.",
    preview:
      "repeating-linear-gradient(45deg, rgba(255,255,255,.5) 0 1px, transparent 1px 5px), repeating-linear-gradient(-45deg, rgba(0,0,0,.35) 0 1px, transparent 1px 6px), linear-gradient(#2c241c, #0e0c0a)",
  },
  {
    id: "foam",
    name: "Foam",
    code: 10,
    hint: "Cells swell with the wave. Bubbles carry pigment.",
    preview:
      "radial-gradient(circle at 25% 30%, rgba(255,255,255,.7) 0 12%, transparent 18%), radial-gradient(circle at 70% 55%, rgba(255,255,255,.5) 0 16%, transparent 24%), radial-gradient(circle at 45% 80%, rgba(200,230,255,.45) 0 10%, transparent 16%), radial-gradient(circle at 80% 20%, rgba(255,255,255,.35) 0 8%, transparent 14%), linear-gradient(#4a88aa, #163044)",
  },
  {
    id: "scan",
    name: "Scan",
    code: 11,
    hint: "Raster roll. The surface writes in lines.",
    preview:
      "repeating-linear-gradient(0deg, rgba(0,0,0,.55) 0 1px, rgba(80,255,160,.25) 1px 2px, transparent 2px 4px), linear-gradient(#04140c, #0a2818)",
  },
  {
    id: "custom",
    name: "Custom",
    code: 12,
    hint: "Your upload or a generated grain. Crop it, then Save as to keep it with the mix.",
    preview: "linear-gradient(145deg, #3a3a44, #1a1a20)",
  },
];

export const DEFAULT_TEXTURE_ID: TextureId = "none";

export function getTexture(id: TextureId | string | undefined): CanvasTexture {
  return TEXTURES.find((t) => t.id === id) ?? TEXTURES[0]!;
}

export const TEXTURE_ROWS: CanvasTexture[][] = [
  TEXTURES.filter((t) => t.id !== "custom").slice(0, 6),
  TEXTURES.filter((t) => t.id !== "custom").slice(6, 12),
];
