import { textureFromCanvas } from "./texture-file";
import type { CustomTexture } from "./studio";

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string): [number, number, number] | null {
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

function valueNoise(rng: () => number, cells: number) {
  const grid: number[][] = [];
  for (let y = 0; y <= cells; y++) {
    grid[y] = [];
    for (let x = 0; x <= cells; x++) grid[y]![x] = rng();
  }
  return (u: number, v: number) => {
    const x = Math.max(0, Math.min(1, u)) * cells;
    const y = Math.max(0, Math.min(1, v)) * cells;
    const x0 = Math.min(cells - 1, Math.floor(x));
    const y0 = Math.min(cells - 1, Math.floor(y));
    const tx = x - x0;
    const ty = y - y0;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const a = grid[y0]![x0]!;
    const b = grid[y0]![x0 + 1]!;
    const c = grid[y0 + 1]![x0]!;
    const d = grid[y0 + 1]![x0 + 1]!;
    return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
  };
}

function mixRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/**
 * Paint a unique grain as a JPEG custom texture — same persist path as Upload.
 * Optional `colors` tints the grain to the live mix so Save as keeps both.
 */
export function makeRandomSurface(colors: string[] = []): CustomTexture {
  const size = 384;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not paint a surface.");

  const rng = mulberry((Math.random() * 0xffffffff) ^ Date.now());
  const palette = (colors.length ? colors : ["#07141f", "#1a4a5c", "#7ec8d8", "#d7f6ff"])
    .map(hexToRgb)
    .filter((c): c is [number, number, number] => c != null);
  if (palette.length === 0) {
    palette.push([7, 20, 31], [26, 74, 92], [126, 200, 216], [215, 246, 255]);
  }
  while (palette.length < 4) palette.push(palette[palette.length - 1]!);
  const n1 = valueNoise(rng, 4 + Math.floor(rng() * 6));
  const n2 = valueNoise(rng, 10 + Math.floor(rng() * 14));
  const n3 = valueNoise(rng, 22 + Math.floor(rng() * 18));
  const mode = Math.floor(rng() * 6);
  const warp = 0.08 + rng() * 0.22;
  const contrast = 0.7 + rng() * 0.7;

  const img = ctx.createImageData(size, size);
  const data = img.data;
  const sites = Array.from({ length: 10 + Math.floor(rng() * 8) }, () => ({
    x: rng(),
    y: rng(),
    r: 0.04 + rng() * 0.18,
  }));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const wu = u + (n2(u, v) - 0.5) * warp;
      const wv = v + (n3(u, v) - 0.5) * warp;
      let t = n1(wu, wv) * 0.55 + n2(wu, wv) * 0.3 + n3(u, v) * 0.15;
      if (mode === 1) t = 0.5 + 0.5 * Math.sin(8 * Math.PI * (u + t));
      if (mode === 2) t = 0.5 + 0.5 * Math.sin((n1(u, v) * 12 + n2(v, u) * 7) * Math.PI);
      if (mode === 3) {
        let d = 9;
        for (const s of sites) {
          const dx = u - s.x;
          const dy = v - s.y;
          d = Math.min(d, Math.sqrt(dx * dx + dy * dy) / s.r);
        }
        t = Math.max(0, 1 - d) * 0.7 + t * 0.3;
      }
      if (mode === 4) {
        const line = Math.abs(Math.sin((v * 48 + t * 6) * Math.PI));
        t = t * 0.55 + line * 0.45;
      }
      if (mode === 5) {
        t = ((t * 6) % 1) * 0.5 + n3(u, v) * 0.5;
      }
      t = Math.max(0, Math.min(1, (t - 0.5) * contrast + 0.5));
      const stops = palette.length - 1;
      const p = t * stops;
      const i = Math.min(stops - 1, Math.floor(p));
      const col = mixRgb(palette[i]!, palette[i + 1]!, p - i);
      const o = (y * size + x) * 4;
      data[o] = col[0]!;
      data[o + 1] = col[1]!;
      data[o + 2] = col[2]!;
      data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  if (rng() > 0.45) {
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.18 + rng() * 0.22;
    const g = ctx.createRadialGradient(size * rng(), size * rng(), 8, size * 0.5, size * 0.5, size * 0.8);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(1, "#000000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  return textureFromCanvas(canvas);
}
