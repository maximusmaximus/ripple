export type PaletteId =
  | 'abyss'
  | 'ember'
  | 'glacier'
  | 'mercury'
  | 'bloom'
  | 'pulse'
  | 'volt'
  | 'crimson'
  | 'solar'
  | 'aurora'
  | 'magma'
  | 'pearl'
  | 'toxic'
  | 'cobalt'
  | 'wine'
  | 'storm'

export type Palette = {
  id: PaletteId
  name: string
  colors: string[]
  defaultRange: [number, number]
  viscosity: number
  waveStrength: number
  cameraMix: number
  micDrive: number
}

export const PALETTE_ORDER: PaletteId[] = [
  'abyss',
  'ember',
  'glacier',
  'mercury',
  'bloom',
  'pulse',
  'volt',
  'crimson',
  'solar',
  'aurora',
  'magma',
  'pearl',
  'toxic',
  'cobalt',
  'wine',
  'storm',
]

export const PALETTES: Record<PaletteId, Palette> = {
  abyss: {
    id: 'abyss',
    name: 'Abyss',
    colors: ['#02040a', '#0a1a2e', '#0e3d5c', '#1a7a9c', '#7ec8e3', '#e8f7ff'],
    defaultRange: [0.05, 0.95],
    viscosity: 0.985,
    waveStrength: 0.55,
    cameraMix: 0.35,
    micDrive: 0.4,
  },
  ember: {
    id: 'ember',
    name: 'Ember',
    colors: ['#1a0500', '#3d0a00', '#8b1a00', '#e85d04', '#ffba08', '#fff3c4'],
    defaultRange: [0.1, 0.9],
    viscosity: 0.97,
    waveStrength: 0.7,
    cameraMix: 0.3,
    micDrive: 0.5,
  },
  glacier: {
    id: 'glacier',
    name: 'Glacier',
    colors: ['#0a1628', '#1b3a4b', '#4a7c8c', '#a8d5e5', '#e8f4f8', '#ffffff'],
    defaultRange: [0.0, 1.0],
    viscosity: 0.992,
    waveStrength: 0.4,
    cameraMix: 0.25,
    micDrive: 0.3,
  },
  mercury: {
    id: 'mercury',
    name: 'Mercury',
    colors: ['#0d0d0d', '#2a2a2a', '#5a5a5a', '#9a9a9a', '#d0d0d0', '#f5f5f5'],
    defaultRange: [0.15, 0.85],
    viscosity: 0.978,
    waveStrength: 0.65,
    cameraMix: 0.45,
    micDrive: 0.35,
  },
  bloom: {
    id: 'bloom',
    name: 'Bloom',
    colors: ['#0a1a0a', '#1a3a1a', '#3d6b3d', '#7aab5a', '#c4e89a', '#f0ffe8'],
    defaultRange: [0.1, 0.9],
    viscosity: 0.988,
    waveStrength: 0.5,
    cameraMix: 0.3,
    micDrive: 0.4,
  },
  pulse: {
    id: 'pulse',
    name: 'Pulse',
    colors: ['#0a0514', '#1a0a2e', '#4a1a6b', '#8b3a9c', '#d07ae3', '#f8e8ff'],
    defaultRange: [0.05, 0.95],
    viscosity: 0.96,
    waveStrength: 0.85,
    cameraMix: 0.4,
    micDrive: 0.7,
  },
  volt: {
    id: 'volt',
    name: 'Volt',
    colors: ['#051405', '#0a2a0a', '#1a5a1a', '#3dff3d', '#a0ff60', '#e8ffe0'],
    defaultRange: [0.2, 0.9],
    viscosity: 0.965,
    waveStrength: 0.9,
    cameraMix: 0.35,
    micDrive: 0.8,
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson',
    colors: ['#140505', '#2e0a0a', '#6b1a1a', '#c43a3a', '#e87a7a', '#ffe8e8'],
    defaultRange: [0.1, 0.9],
    viscosity: 0.98,
    waveStrength: 0.6,
    cameraMix: 0.3,
    micDrive: 0.45,
  },
  solar: {
    id: 'solar',
    name: 'Solar',
    colors: ['#1a1000', '#3d2800', '#8b5a00', '#e8a000', '#ffd060', '#fff8e0'],
    defaultRange: [0.05, 0.95],
    viscosity: 0.975,
    waveStrength: 0.75,
    cameraMix: 0.4,
    micDrive: 0.55,
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    colors: ['#050a14', '#0a1a2e', '#1a4a5a', '#3d9c7a', '#7ae8c4', '#e0fff0'],
    defaultRange: [0.0, 1.0],
    viscosity: 0.99,
    waveStrength: 0.45,
    cameraMix: 0.5,
    micDrive: 0.35,
  },
  magma: {
    id: 'magma',
    name: 'Magma',
    colors: ['#0a0500', '#2a0a00', '#6b1a00', '#c43a00', '#ff6a00', '#ffd0a0'],
    defaultRange: [0.15, 0.9],
    viscosity: 0.955,
    waveStrength: 1.0,
    cameraMix: 0.25,
    micDrive: 0.6,
  },
  pearl: {
    id: 'pearl',
    name: 'Pearl',
    colors: ['#1a1814', '#3a3630', '#6a6560', '#a8a09a', '#e0d8d0', '#fff8f0'],
    defaultRange: [0.1, 0.9],
    viscosity: 0.995,
    waveStrength: 0.35,
    cameraMix: 0.55,
    micDrive: 0.25,
  },
  toxic: {
    id: 'toxic',
    name: 'Toxic',
    colors: ['#0a1405', '#1a2a0a', '#3a5a1a', '#7ab030', '#c4e830', '#f0ffe0'],
    defaultRange: [0.1, 0.95],
    viscosity: 0.97,
    waveStrength: 0.8,
    cameraMix: 0.3,
    micDrive: 0.65,
  },
  cobalt: {
    id: 'cobalt',
    name: 'Cobalt',
    colors: ['#050a1a', '#0a1a3a', '#1a3a6b', '#3a6ab0', '#7aa0e8', '#e0ecff'],
    defaultRange: [0.05, 0.95],
    viscosity: 0.982,
    waveStrength: 0.55,
    cameraMix: 0.4,
    micDrive: 0.4,
  },
  wine: {
    id: 'wine',
    name: 'Wine',
    colors: ['#14050a', '#2e0a14', '#5a1a2e', '#9c3a5a', '#d07a9a', '#ffe0ec'],
    defaultRange: [0.1, 0.9],
    viscosity: 0.988,
    waveStrength: 0.5,
    cameraMix: 0.35,
    micDrive: 0.4,
  },
  storm: {
    id: 'storm',
    name: 'Storm',
    colors: ['#080a10', '#141a28', '#2a3a50', '#5a7a9a', '#a0c0d8', '#e8f0f8'],
    defaultRange: [0.0, 1.0],
    viscosity: 0.96,
    waveStrength: 0.95,
    cameraMix: 0.3,
    micDrive: 0.75,
  },
}

export function paletteGradient(colors: string[]): string {
  if (colors.length === 0) return 'transparent'
  if (colors.length === 1) return colors[0]!
  const stops = colors.map((c, i) => `${c} ${(i / (colors.length - 1)) * 100}%`)
  return `linear-gradient(90deg, ${stops.join(', ')})`
}

export function samplePalette(colors: string[], t: number): string {
  if (colors.length === 0) return '#000'
  if (colors.length === 1) return colors[0]!
  const x = Math.max(0, Math.min(1, t)) * (colors.length - 1)
  const i = Math.floor(x)
  const f = x - i
  if (i >= colors.length - 1) return colors[colors.length - 1]!
  return lerpHex(colors[i]!, colors[i + 1]!, f)
}

function lerpHex(a: string, b: string, t: number): string {
  const pa = parseHex(a)
  const pb = parseHex(b)
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t)
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t)
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t)
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`
}

function parseHex(h: string): [number, number, number] {
  const s = h.replace('#', '')
  const n = parseInt(s.length === 3 ? s.split('').map((c) => c + c).join('') : s, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
