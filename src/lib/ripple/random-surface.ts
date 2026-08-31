import { textureFromCanvas } from "./texture-file";
import { newCustomSurfaceId, uniqueSurfaceName, type CustomTexture } from "./studio";

type Rgb = [number, number, number];
type Rng = () => number;

type Recipe = {
  id: string;
  name: string;
  paint: (ctx: CanvasRenderingContext2D, size: number, rng: Rng, palette: Rgb[]) => void;
};

const SIZE = 320;
const recentRecipes: string[] = [];

function mulberry(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string): Rgb | null {
  const raw = hex.trim();
  const h = raw.startsWith("#") ? raw.slice(1) : raw;
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function clamp01(t: number) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function fade(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function hash2(ix: number, iy: number, seed: number) {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function gradNoise(u: number, v: number, freq: number, seed: number) {
  const x = u * freq;
  const y = v * freq;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = fade(x - x0);
  const ty = fade(y - y0);
  const g = (ix: number, iy: number) => {
    const a = hash2(ix, iy, seed) * Math.PI * 2;
    return Math.cos(a) * (x - ix) + Math.sin(a) * (y - iy);
  };
  return (lerp(lerp(g(x0, y0), g(x0 + 1, y0), tx), lerp(g(x0, y0 + 1), g(x0 + 1, y0 + 1), tx), ty) + 1) * 0.5;
}

function fbm(u: number, v: number, octaves: number, freq: number, seed: number) {
  let a = 0;
  let w = 0.5;
  let f = freq;
  let s = 0;
  for (let i = 0; i < octaves; i++) {
    a += w * gradNoise(u, v, f, seed + i * 101);
    s += w;
    w *= 0.5;
    f *= 2.03;
  }
  return a / s;
}

function ridge(u: number, v: number, octaves: number, freq: number, seed: number) {
  let a = 0;
  let w = 0.5;
  let f = freq;
  let s = 0;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(gradNoise(u, v, f, seed + i * 17) * 2 - 1);
    a += w * n * n;
    s += w;
    w *= 0.48;
    f *= 2.18;
  }
  return a / s;
}

function worley(u: number, v: number, cells: number, seed: number) {
  const gx = u * cells;
  const gy = v * cells;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  let d1 = 9;
  let d2 = 9;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const cx = ix + ox;
      const cy = iy + oy;
      const px = cx + hash2(cx, cy, seed);
      const py = cy + hash2(cx, cy, seed + 31);
      const d = Math.hypot(gx - px, gy - py);
      if (d < d1) {
        d2 = d1;
        d1 = d;
      } else if (d < d2) d2 = d;
    }
  }
  return { f1: d1, f2: d2 };
}

function hslRgb(h: number, s: number, l: number): Rgb {
  const hue = ((h % 1) + 1) % 1;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + hue * 12) % 12;
    return (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)) * 255;
  };
  return [f(0), f(8), f(4)];
}

function sampleRamp(palette: Rgb[], t: number): Rgb {
  const x = clamp01(t) * (palette.length - 1);
  const i = Math.min(palette.length - 2, Math.floor(x));
  return mixRgb(palette[i]!, palette[i + 1]!, x - i);
}

function fillPixels(
  ctx: CanvasRenderingContext2D,
  size: number,
  shade: (u: number, v: number) => Rgb,
) {
  const img = ctx.createImageData(size, size);
  const data = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const col = shade(x / size, y / size);
      const o = (y * size + x) * 4;
      data[o] = col[0]!;
      data[o + 1] = col[1]!;
      data[o + 2] = col[2]!;
      data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

const STONE: Rgb[][] = [
  [[28, 22, 18], [92, 72, 52], [176, 154, 126], [236, 226, 210]],
  [[8, 10, 16], [28, 48, 72], [92, 148, 176], [220, 236, 244]],
  [[10, 10, 10], [48, 48, 50], [140, 140, 144], [236, 236, 238]],
  [[22, 6, 8], [110, 28, 24], [196, 86, 42], [252, 214, 168]],
  [[8, 18, 14], [24, 72, 48], [92, 156, 108], [214, 236, 210]],
  [[16, 8, 24], [64, 28, 92], [168, 86, 164], [248, 214, 236]],
  [[24, 16, 6], [96, 68, 18], [196, 158, 48], [252, 244, 210]],
  [[6, 10, 12], [18, 48, 44], [64, 120, 108], [196, 228, 214]],
  [[32, 10, 6], [96, 28, 12], [188, 72, 28], [248, 176, 92]],
  [[4, 6, 14], [12, 24, 64], [48, 88, 176], [196, 216, 252]],
  [[18, 14, 10], [56, 40, 28], [120, 88, 56], [212, 188, 148]],
  [[6, 8, 20], [40, 16, 72], [140, 48, 160], [240, 200, 120]],
];

function nativePalette(rng: Rng): Rgb[] {
  return STONE[Math.floor(rng() * STONE.length)]!.map((c) => [...c] as Rgb);
}

function bakePalette(rng: Rng, live: Rgb[]): Rgb[] {
  const native = nativePalette(rng);
  if (live.length >= 2 && rng() < 0.22) {
    return native.map((c, i) => mixRgb(c, live[Math.min(i, live.length - 1)]!, 0.38));
  }
  return native;
}

function pickRecipe(rng: Rng, recipes: Recipe[]): Recipe {
  const blocked = new Set(recentRecipes);
  const pool = recipes.filter((r) => !blocked.has(r.id));
  const list = pool.length ? pool : recipes;
  const recipe = list[Math.floor(rng() * list.length)]!;
  recentRecipes.push(recipe.id);
  if (recentRecipes.length > 5) recentRecipes.shift();
  return recipe;
}

function hexGrid(u: number, v: number, scale: number) {
  const x = u * scale;
  const y = v * scale * 1.1547;
  const row = Math.floor(y);
  const odd = row & 1;
  const col = Math.floor(x - (odd ? 0.5 : 0));
  let best = 9;
  let bx = 0;
  let by = 0;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const ry = row + oy;
      const rx = col + ox;
      const cx = rx + ((ry & 1) ? 0.5 : 0) + 0.5;
      const cy = ry * 0.866 + 0.5;
      const d = Math.hypot(x - cx, y * 0.866 - cy);
      if (d < best) {
        best = d;
        bx = rx;
        by = ry;
      }
    }
  }
  return { d: best, ix: bx, iy: by };
}

const RECIPES: Recipe[] = [
  {
    id: "vein",
    name: "Vein",
    paint(ctx, size, rng, palette) {
      const seed = Math.floor(rng() * 1e9);
      const warp = 0.18 + rng() * 0.28;
      const freq = 2.4 + rng() * 1.4;
      fillPixels(ctx, size, (u, v) => {
        const wu = u + (fbm(u, v, 3, 3.2, seed) - 0.5) * warp;
        const wv = v + (fbm(u + 2, v, 3, 3.4, seed + 7) - 0.5) * warp;
        const r = ridge(wu, wv, 5, freq, seed + 11);
        const n = fbm(wu, wv, 4, 5.5, seed + 19);
        const vein = Math.pow(clamp01(1.15 - r * 1.4), 6);
        const t = clamp01(n * 0.55 + r * 0.3 + vein * 0.5);
        const col = sampleRamp(palette, t);
        return mixRgb(col, [8, 6, 5], vein * 0.65);
      });
    },
  },
  {
    id: "cells",
    name: "Cells",
    paint(ctx, size, rng, palette) {
      const seed = Math.floor(rng() * 1e9);
      const cells = 5 + Math.floor(rng() * 7);
      fillPixels(ctx, size, (u, v) => {
        const w = worley(u, v, cells, seed);
        const n = fbm(u, v, 3, 4, seed + 3);
        const edge = clamp01((w.f2 - w.f1) * 2.4);
        const t = clamp01(w.f1 * 0.55 + n * 0.25 + (1 - edge) * 0.35);
        const col = sampleRamp(palette, t);
        return mixRgb(col, sampleRamp(palette, 0.05), 1 - edge * 0.7);
      });
    },
  },
  {
    id: "wood",
    name: "Wood",
    paint(ctx, size, rng, palette) {
      const seed = Math.floor(rng() * 1e9);
      const cx = 0.35 + rng() * 0.3;
      const cy = -0.2 + rng() * 0.4;
      const stretch = 1.4 + rng() * 1.1;
      const rings = 18 + rng() * 22;
      fillPixels(ctx, size, (u, v) => {
        const n = fbm(u, v, 4, 3.6, seed);
        const g = fbm(u * 0.4, v * 6, 3, 8, seed + 5);
        const dx = u - cx + (n - 0.5) * 0.16;
        const dy = (v - cy) * stretch + (n - 0.5) * 0.08;
        const r = Math.hypot(dx, dy);
        const band = 0.5 + 0.5 * Math.sin((r * rings + n * 1.6) * Math.PI * 2);
        const t = clamp01(band * 0.72 + g * 0.28);
        return sampleRamp(palette, t);
      });
    },
  },
  {
    id: "linen",
    name: "Linen",
    paint(ctx, size, rng, palette) {
      ctx.fillStyle = `rgb(${palette[1]!.join(",")})`;
      ctx.fillRect(0, 0, size, size);
      const warp = 4 + Math.floor(rng() * 5);
      const weft = 4 + Math.floor(rng() * 5);
      const a = palette[2]!;
      const b = palette[0]!;
      ctx.lineCap = "round";
      for (let i = 0; i < size * 1.35; i++) {
        const vertical = rng() > 0.5;
        ctx.strokeStyle = `rgba(${(rng() > 0.5 ? a : b).join(",")},${0.18 + rng() * 0.45})`;
        ctx.lineWidth = 0.55 + rng() * 1.4;
        ctx.beginPath();
        if (vertical) {
          const x = ((i * warp) % size) + (rng() - 0.5) * 3;
          ctx.moveTo(x, -2);
          ctx.lineTo(x + (rng() - 0.5) * 6, size + 2);
        } else {
          const y = ((i * weft) % size) + (rng() - 0.5) * 3;
          ctx.moveTo(-2, y);
          ctx.lineTo(size + 2, y + (rng() - 0.5) * 6);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = `rgb(${palette[3]!.join(",")})`;
      ctx.fillRect(0, 0, size, size);
      ctx.globalAlpha = 1;
    },
  },
  {
    id: "caustic",
    name: "Caustic",
    paint(ctx, size, rng, palette) {
      const seed = Math.floor(rng() * 1e9);
      const k1 = 3 + rng() * 4;
      const k2 = 5 + rng() * 6;
      fillPixels(ctx, size, (u, v) => {
        const w1 = fbm(u, v, 3, 2.2, seed);
        const w2 = fbm(u + 4, v, 3, 3.1, seed + 9);
        const s =
          Math.sin((u * k1 + w1) * Math.PI * 2) * Math.sin((v * k2 + w2) * Math.PI * 2) * 0.5 +
          0.5 * Math.sin((u + v + w1) * 9);
        const t = clamp01(s * 0.55 + w1 * 0.45);
        const col = sampleRamp(palette, t);
        const glow = Math.pow(clamp01(s), 4);
        return mixRgb(col, [255, 255, 245], glow * 0.55);
      });
    },
  },
  {
    id: "terrazzo",
    name: "Terrazzo",
    paint(ctx, size, rng, palette) {
      const seed = Math.floor(rng() * 1e9);
      const cells = 7 + Math.floor(rng() * 8);
      const chips: Rgb[] = [
        palette[3]!,
        palette[2]!,
        palette[1]!,
        mixRgb(palette[0]!, [240, 230, 210], 0.4),
        hslRgb(rng(), 0.45, 0.48),
        hslRgb(rng(), 0.55, 0.38),
      ];
      fillPixels(ctx, size, (u, v) => {
        const w = worley(u, v, cells, seed);
        const id = Math.floor(hash2(Math.floor(u * cells), Math.floor(v * cells), seed) * chips.length);
        const grout = clamp01((w.f2 - w.f1) * 4.2);
        const chip = chips[id % chips.length]!;
        const n = fbm(u, v, 2, 10, seed + 4);
        const speck = n > 0.78 ? mixRgb(chip, [255, 255, 255], 0.35) : chip;
        return mixRgb(palette[0]!, speck, grout);
      });
    },
  },
  {
    id: "slick",
    name: "Slick",
    paint(ctx, size, rng) {
      const seed = Math.floor(rng() * 1e9);
      const hue0 = rng();
      fillPixels(ctx, size, (u, v) => {
        const wu = u + (fbm(u, v, 4, 2.4, seed) - 0.5) * 0.45;
        const wv = v + (fbm(v, u, 4, 2.6, seed + 3) - 0.5) * 0.45;
        const n = ridge(wu, wv, 4, 3.2, seed + 8);
        const h = hue0 + n * 0.85 + fbm(wu, wv, 3, 6, seed + 12) * 0.2;
        const l = 0.18 + n * 0.55;
        return hslRgb(h, 0.72, l);
      });
    },
  },
  {
    id: "brushed",
    name: "Brushed",
    paint(ctx, size, rng, palette) {
      const seed = Math.floor(rng() * 1e9);
      const angle = rng() * Math.PI;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      fillPixels(ctx, size, (u, v) => {
        const x = u * c + v * s;
        const y = -u * s + v * c;
        const streak = fbm(x * 0.15, y * 7.5, 4, 6, seed);
        const grit = gradNoise(u, v, 90, seed + 4);
        const t = clamp01(streak * 0.82 + grit * 0.18);
        return sampleRamp(palette, t);
      });
    },
  },
  {
    id: "cloud",
    name: "Cloud",
    paint(ctx, size, rng, palette) {
      const seed = Math.floor(rng() * 1e9);
      fillPixels(ctx, size, (u, v) => {
        const n = fbm(u, v, 6, 2.1, seed);
        const n2 = fbm(u + 5, v - 2, 4, 4.4, seed + 6);
        const billow = Math.abs(n * 2 - 1);
        const t = clamp01(Math.pow(billow, 0.85) * 0.7 + n2 * 0.3);
        return sampleRamp(palette, t);
      });
    },
  },
  {
    id: "raster",
    name: "Raster",
    paint(ctx, size, rng, palette) {
      const seed = Math.floor(rng() * 1e9);
      const pitch = 2 + Math.floor(rng() * 3);
      fillPixels(ctx, size, (u, v) => {
        const n = fbm(u, v, 3, 5, seed);
        const scan = ((v * size) | 0) % pitch === 0 ? 0.18 : 0;
        const roll = 0.5 + 0.5 * Math.sin(v * 40 + n * 6);
        const drop = n < 0.08 ? 0 : 1;
        const t = clamp01((n * 0.55 + roll * 0.45) * drop - scan);
        const col = sampleRamp(palette, t);
        const glow = n > 0.82 ? mixRgb(col, [120, 255, 170], 0.35) : col;
        return glow;
      });
    },
  },
  {
    id: "wash",
    name: "Wash",
    paint(ctx, size, rng, palette) {
      ctx.fillStyle = `rgb(${palette[0]!.join(",")})`;
      ctx.fillRect(0, 0, size, size);
      const blobs = 7 + Math.floor(rng() * 8);
      for (let i = 0; i < blobs; i++) {
        const x = rng() * size;
        const y = rng() * size;
        const r = size * (0.12 + rng() * 0.34);
        const col = palette[1 + (i % (palette.length - 1))]!;
        const g = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
        g.addColorStop(0, `rgba(${col.join(",")},${0.55 + rng() * 0.4})`);
        g.addColorStop(1, `rgba(${col.join(",")},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 0.28;
      const fiber = ctx.createLinearGradient(0, 0, size, size);
      fiber.addColorStop(0, `rgb(${palette[0]!.join(",")})`);
      fiber.addColorStop(1, `rgb(${palette[3]!.join(",")})`);
      ctx.fillStyle = fiber;
      ctx.fillRect(0, 0, size, size);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    },
  },
  {
    id: "scale",
    name: "Scale",
    paint(ctx, size, rng, palette) {
      const seed = Math.floor(rng() * 1e9);
      const sc = 8 + rng() * 10;
      fillPixels(ctx, size, (u, v) => {
        const h = hexGrid(u, v, sc);
        const n = fbm(u, v, 3, 4, seed);
        const rim = clamp01((0.48 - h.d) * 4);
        const t = clamp01(hash2(h.ix, h.iy, seed) * 0.55 + n * 0.25 + rim * 0.3);
        const col = sampleRamp(palette, t);
        return mixRgb(col, palette[0]!, 1 - rim * 0.55);
      });
    },
  },
  {
    id: "rings",
    name: "Rings",
    paint(ctx, size, rng, palette) {
      const seed = Math.floor(rng() * 1e9);
      const sites = Array.from({ length: 4 + Math.floor(rng() * 4) }, () => ({
        x: rng(),
        y: rng(),
        k: 6 + rng() * 16,
      }));
      fillPixels(ctx, size, (u, v) => {
        let s = 0;
        for (const p of sites) {
          const d = Math.hypot(u - p.x, v - p.y);
          s += Math.sin(d * p.k * Math.PI * 2);
        }
        const n = fbm(u, v, 3, 3.5, seed);
        const t = clamp01(0.5 + s / (sites.length * 2) + (n - 0.5) * 0.25);
        return sampleRamp(palette, t);
      });
    },
  },
  {
    id: "strata",
    name: "Strata",
    paint(ctx, size, rng, palette) {
      const seed = Math.floor(rng() * 1e9);
      const bands = 7 + Math.floor(rng() * 7);
      fillPixels(ctx, size, (u, v) => {
        const n = fbm(u * 0.6, v, 4, 3.2, seed);
        const e = fbm(u, v * 0.4, 3, 8, seed + 4);
        const y = clamp01(v + (n - 0.5) * 0.14);
        const band = Math.floor(y * bands);
        const inner = (y * bands) % 1;
        const a = sampleRamp(palette, (band % (palette.length - 1)) / (palette.length - 1));
        const b = sampleRamp(palette, ((band + 1) % (palette.length - 1)) / (palette.length - 1));
        const col = mixRgb(a, b, fade(inner));
        return mixRgb(col, palette[0]!, e * 0.18);
      });
    },
  },
  {
    id: "dust",
    name: "Dust",
    paint(ctx, size, rng, palette) {
      const seed = Math.floor(rng() * 1e9);
      ctx.fillStyle = `rgb(${palette[0]!.join(",")})`;
      ctx.fillRect(0, 0, size, size);
      fillPixels(ctx, size, (u, v) => {
        const neb = fbm(u, v, 5, 1.8, seed);
        const speck = hash2((u * size) | 0, (v * size) | 0, seed + 9);
        const star = speck > 0.996 ? 1 : speck > 0.985 ? 0.45 : 0;
        const col = sampleRamp(palette, neb);
        return mixRgb(col, [255, 248, 230], star);
      });
    },
  },
  {
    id: "plaid",
    name: "Plaid",
    paint(ctx, size, rng, palette) {
      const fx = 4 + Math.floor(rng() * 6);
      const fy = 4 + Math.floor(rng() * 6);
      const seed = Math.floor(rng() * 1e9);
      fillPixels(ctx, size, (u, v) => {
        const bx = 0.5 + 0.5 * Math.sin(u * fx * Math.PI * 2);
        const by = 0.5 + 0.5 * Math.sin(v * fy * Math.PI * 2);
        const n = fbm(u, v, 2, 12, seed);
        const t = clamp01(bx * 0.4 + by * 0.4 + n * 0.2);
        return sampleRamp(palette, t);
      });
    },
  },
];

function finish(ctx: CanvasRenderingContext2D, size: number, rng: Rng) {
  const roll = rng();
  if (roll < 0.35) {
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.16 + rng() * 0.22;
    const g = ctx.createRadialGradient(size * rng(), size * rng(), 6, size * 0.5, size * 0.5, size * 0.82);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(1, "#000000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  } else if (roll < 0.55) {
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = 0.12 + rng() * 0.16;
    ctx.strokeStyle = "#1a120c";
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 18 + Math.floor(rng() * 22); i++) {
      ctx.beginPath();
      ctx.moveTo(rng() * size, rng() * size);
      ctx.lineTo(rng() * size, rng() * size);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}

/**
 * Paint a unique grain as a JPEG custom texture — same persist path as Upload.
 * Recipes are distinct (vein, wood, cells, slick, …) and consecutive taps skip
 * recent ones. Live mix colors only tint a minority of grains.
 */
export function makeRandomSurface(colors: string[] = [], takenNames: string[] = []): CustomTexture {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not paint a surface.");

  const rng = mulberry((Math.random() * 0xffffffff) ^ (Date.now() * 0x9e3779b9));
  const live = (colors.length ? colors : [])
    .map(hexToRgb)
    .filter((c): c is Rgb => c != null);
  const palette = bakePalette(rng, live);
  while (palette.length < 4) palette.push(palette[palette.length - 1] ?? [20, 20, 24]);

  const recipe = pickRecipe(rng, RECIPES);
  recipe.paint(ctx, SIZE, rng, palette);
  finish(ctx, SIZE, rng);

  return {
    ...textureFromCanvas(canvas),
    id: newCustomSurfaceId(),
    name: uniqueSurfaceName(recipe.name, takenNames),
    kind: "random",
  };
}

export const RANDOM_SURFACE_RECIPES = RECIPES.map((r) => r.id);
