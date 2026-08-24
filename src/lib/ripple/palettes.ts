export type PaletteId =
  | 'lens'
  | 'voice'
  | 'slosh'
  | 'mirror'
  | 'ember'
  | 'gel'
  | 'volt'
  | 'magma'
  | 'ghost'
  | 'riot'

export type ColorPair = {
  /** Base / key light — crests, highlights. */
  key: string
  /** Shadow — troughs, depth. */
  shadow: string
}

export type Palette = {
  id: PaletteId
  name: string
  key: string
  shadow: string
  colors: string[]
  defaultRange: [number, number]
  viscosity: number
  waveStrength: number
  cameraMix: number
  micDrive: number
  gyroDrive: number
}

export const PALETTE_ORDER: PaletteId[] = [
  'lens',
  'voice',
  'slosh',
  'mirror',
  'ember',
  'gel',
  'volt',
  'magma',
  'ghost',
  'riot',
]

/** 6-stop water ramp: deep shadow → shadow → mid → key → foam. */
export function rampFromPair(shadow: string, key: string): string[] {
  const s = parseHex(shadow)
  const k = parseHex(key)
  const deep = mixRgb(s, [0, 0, 0], 0.42)
  const towardKey = mixRgb(s, k, 0.32)
  const mid = mixRgb(s, k, 0.58)
  const foam = mixRgb(k, [255, 255, 255], 0.36)
  return [hexRgb(deep), normalizeHex(shadow), hexRgb(towardKey), hexRgb(mid), normalizeHex(key), hexRgb(foam)]
}

function world(
  id: PaletteId,
  name: string,
  shadow: string,
  key: string,
  rest: {
    defaultRange: [number, number]
    viscosity: number
    waveStrength: number
    cameraMix: number
    micDrive: number
    gyroDrive: number
    colors?: string[]
  },
): Palette {
  const { colors, ...feel } = rest
  return {
    id,
    name,
    key: normalizeHex(key),
    shadow: normalizeHex(shadow),
    colors: colors ?? rampFromPair(shadow, key),
    ...feel,
  }
}

export const PALETTES: Record<PaletteId, Palette> = {
  /** Camera is the medium — paint is a glass lens over the feed. */
  lens: world('lens', 'Lens', '#07141f', '#d7f6ff', {
    defaultRange: [0.02, 0.98],
    viscosity: 0.991,
    waveStrength: 0.32,
    cameraMix: 0.95,
    micDrive: 0.22,
    gyroDrive: 0.35,
    colors: ['#03080e', '#07141f', '#1a4a5c', '#7ec8d8', '#d7f6ff', '#ffffff'],
  }),
  /** Mic owns the color — talk and the ramp jumps. */
  voice: world('voice', 'Voice', '#1a0524', '#ff4fd8', {
    defaultRange: [0.05, 0.95],
    viscosity: 0.972,
    waveStrength: 0.72,
    cameraMix: 0.38,
    micDrive: 1.35,
    gyroDrive: 0.4,
    colors: ['#0a0210', '#1a0524', '#6b1a8a', '#c43adf', '#ff4fd8', '#ffe8ff'],
  }),
  /** Gyro pours the ink. Loose, heavy slosh. */
  slosh: world('slosh', 'Slosh', '#101820', '#8ab4c8', {
    defaultRange: [0.0, 1.0],
    viscosity: 0.942,
    waveStrength: 0.95,
    cameraMix: 0.28,
    micDrive: 0.32,
    gyroDrive: 1.45,
    colors: ['#07090c', '#101820', '#2a3e50', '#5a7a90', '#8ab4c8', '#e4f0f6'],
  }),
  /** Slow chrome. Camera fills the metal. */
  mirror: world('mirror', 'Mirror', '#1a1c1e', '#e8eaee', {
    defaultRange: [0.12, 0.88],
    viscosity: 0.994,
    waveStrength: 0.42,
    cameraMix: 0.88,
    micDrive: 0.24,
    gyroDrive: 0.7,
    colors: ['#0a0b0c', '#1a1c1e', '#4a4e54', '#8a9098', '#c8ccd2', '#e8eaee'],
  }),
  /** Fire sits on top of the camera. Mic crackles the crests. */
  ember: world('ember', 'Ember', '#2a0600', '#ffb020', {
    defaultRange: [0.08, 0.92],
    viscosity: 0.968,
    waveStrength: 0.88,
    cameraMix: 0.2,
    micDrive: 0.72,
    gyroDrive: 0.55,
    colors: ['#0a0200', '#2a0600', '#8b1a00', '#e85d04', '#ffb020', '#fff0c4'],
  }),
  /** Thick gel. Almost still — camera as a stained wash. */
  gel: world('gel', 'Gel', '#0c221c', '#b8ffe0', {
    defaultRange: [0.0, 1.0],
    viscosity: 0.997,
    waveStrength: 0.2,
    cameraMix: 0.52,
    micDrive: 0.15,
    gyroDrive: 0.18,
    colors: ['#04140e', '#0c221c', '#1a5a48', '#4ad4a0', '#b8ffe0', '#f4fff8'],
  }),
  /** Snappy neon. Mic and waves are loud. */
  volt: world('volt', 'Volt', '#031a08', '#c8ff3a', {
    defaultRange: [0.15, 0.95],
    viscosity: 0.952,
    waveStrength: 1.08,
    cameraMix: 0.55,
    micDrive: 1.12,
    gyroDrive: 0.82,
    colors: ['#010a04', '#031a08', '#0a5a12', '#3dff3d', '#c8ff3a', '#f4ffe0'],
  }),
  /** Rolling lava. Gyro drags hot mass. Paint hides the camera. */
  magma: world('magma', 'Magma', '#1a0500', '#ff6a00', {
    defaultRange: [0.1, 0.9],
    viscosity: 0.958,
    waveStrength: 1.18,
    cameraMix: 0.16,
    micDrive: 0.55,
    gyroDrive: 0.98,
    colors: ['#080200', '#1a0500', '#6b1200', '#c43a00', '#ff6a00', '#ffd0a0'],
  }),
  /** Paint is a veil. Camera is the picture. */
  ghost: world('ghost', 'Ghost', '#2a2830', '#f4f0ff', {
    defaultRange: [0.05, 0.98],
    viscosity: 0.995,
    waveStrength: 0.28,
    cameraMix: 1.0,
    micDrive: 0.28,
    gyroDrive: 0.22,
    colors: ['#141318', '#2a2830', '#6a6878', '#b8b4c8', '#e8e4f4', '#f4f0ff'],
  }),
  /** Everything fights — mic, gyro, camera, wild waves. */
  riot: world('riot', 'Riot', '#120018', '#00f0ff', {
    defaultRange: [0.0, 1.0],
    viscosity: 0.938,
    waveStrength: 1.22,
    cameraMix: 0.78,
    micDrive: 1.4,
    gyroDrive: 1.35,
    colors: ['#0a0010', '#120018', '#d4007a', '#ff5a00', '#ffe14a', '#00f0ff'],
  }),
}

export function resolvePair(palette: Palette, override?: ColorPair | null): ColorPair {
  return {
    key: normalizeHex(override?.key ?? palette.key),
    shadow: normalizeHex(override?.shadow ?? palette.shadow),
  }
}

export function resolveColors(palette: Palette, override?: ColorPair | null): string[] {
  const pair = resolvePair(palette, override)
  if (pair.key === palette.key && pair.shadow === palette.shadow) {
    return palette.colors
  }
  return rampFromPair(pair.shadow, pair.key)
}

export function paletteGradient(colors: string[]): string {
  if (colors.length === 0) return 'transparent'
  if (colors.length === 1) return colors[0]!
  const stops = colors.map((c, i) => `${c} ${(i / (colors.length - 1)) * 100}%`)
  return `linear-gradient(90deg, ${stops.join(', ')})`
}

export function samplePalette(colors: string[], t: number): string {
  if (colors.length === 0) return '#000000'
  if (colors.length === 1) return colors[0]!
  const x = Math.max(0, Math.min(1, t)) * (colors.length - 1)
  const i = Math.floor(x)
  const f = x - i
  if (i >= colors.length - 1) return colors[colors.length - 1]!
  return lerpHex(colors[i]!, colors[i + 1]!, f)
}

export function normalizeHex(h: string): string {
  const s = h.replace('#', '').trim()
  if (s.length === 3) {
    return `#${s.split('').map((c) => c + c).join('')}`.toLowerCase()
  }
  if (s.length >= 6) return `#${s.slice(0, 6).toLowerCase()}`
  return '#000000'
}

function lerpHex(a: string, b: string, t: number): string {
  const pa = parseHex(a)
  const pb = parseHex(b)
  return hexRgb(mixRgb(pa, pb, t))
}

function mixRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

function hexRgb(rgb: [number, number, number]): string {
  const [r, g, b] = rgb
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

function parseHex(h: string): [number, number, number] {
  const s = normalizeHex(h).slice(1)
  const n = parseInt(s, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export type ColorStop = {
  id: string
  /** Position along the gradient 0–1. */
  t: number
  color: string
  /** 0 = hole (see camera / bed), 1 = solid. */
  alpha?: number
}

/** Default 6 palette colors + 5 extras. */
export const MAX_COLOR_STOPS = 11
export const MIN_COLOR_STOPS = 2

let stopSeq = 0
export function newStopId(): string {
  stopSeq += 1
  return `s${Date.now().toString(36)}_${stopSeq}`
}

export function stopsFromColors(colors: string[], idPrefix = 'c'): ColorStop[] {
  if (colors.length === 0) return [{ id: `${idPrefix}-0`, t: 0, color: '#000000' }]
  if (colors.length === 1) return [{ id: `${idPrefix}-0`, t: 0, color: colors[0]! }]
  return colors.map((color, i) => ({
    id: `${idPrefix}-${i}`,
    t: i / (colors.length - 1),
    color,
  }))
}

export function sortStops(stops: ColorStop[]): ColorStop[] {
  return [...stops].sort((a, b) => a.t - b.t)
}

export function stopAlpha(stop: ColorStop): number {
  if (stop.alpha == null) return 1
  return Math.max(0, Math.min(1, stop.alpha))
}

export function stopCss(stop: ColorStop): string {
  const a = stopAlpha(stop)
  if (a <= 0.001) return 'rgba(0,0,0,0)'
  if (a >= 0.999) return stop.color
  const [r, g, b] = parseHex(stop.color)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

export function gradientFromStops(stops: ColorStop[]): string {
  const sorted = sortStops(stops)
  if (sorted.length === 0) return 'transparent'
  if (sorted.length === 1) return stopCss(sorted[0]!)
  const parts = sorted.map((s) => `${stopCss(s)} ${s.t * 100}%`)
  return `linear-gradient(90deg, ${parts.join(', ')})`
}

export function sampleFromStops(stops: ColorStop[], t: number): string {
  const sorted = sortStops(stops)
  if (sorted.length === 0) return '#000000'
  if (sorted.length === 1) return sorted[0]!.color
  const x = Math.max(0, Math.min(1, t))
  if (x <= sorted[0]!.t) return sorted[0]!.color
  const last = sorted[sorted.length - 1]!
  if (x >= last.t) return last.color
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!
    const b = sorted[i + 1]!
    if (x >= a.t && x <= b.t) {
      const span = b.t - a.t
      const f = span > 1e-6 ? (x - a.t) / span : 0
      return lerpHex(a.color, b.color, f)
    }
  }
  return last.color
}

export function resampleStops(stops: ColorStop[], count = 6): string[] {
  const sorted = sortStops(stops)
  if (sorted.length === 0) return Array.from({ length: count }, () => '#000000')
  if (count <= 1) return [sampleFromStops(sorted, 0.5)]
  return Array.from({ length: count }, (_, i) =>
    sampleFromStops(sorted, i / (count - 1)),
  )
}

export function addStop(stops: ColorStop[], color?: string): ColorStop[] {
  const sorted = sortStops(stops)
  if (sorted.length >= MAX_COLOR_STOPS) return sorted
  if (sorted.length === 0) {
    return [{ id: newStopId(), t: 0.5, color: color ?? '#ffffff' }]
  }
  if (sorted.length === 1) {
    const only = sorted[0]!
    const t = only.t < 0.5 ? Math.min(1, only.t + 0.35) : Math.max(0, only.t - 0.35)
    return sortStops([
      only,
      { id: newStopId(), t, color: color ?? sampleFromStops(sorted, t) },
    ])
  }
  let bestI = 0
  let bestGap = -1
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1]!.t - sorted[i]!.t
    if (gap > bestGap) {
      bestGap = gap
      bestI = i
    }
  }
  const a = sorted[bestI]!
  const b = sorted[bestI + 1]!
  const t = (a.t + b.t) / 2
  const c = color ?? sampleFromStops(sorted, t)
  return sortStops([...sorted, { id: newStopId(), t, color: c }])
}

export function removeStop(stops: ColorStop[], id: string): ColorStop[] {
  if (stops.length <= MIN_COLOR_STOPS) return stops
  return sortStops(stops.filter((s) => s.id !== id))
}

export function updateStop(
  stops: ColorStop[],
  id: string,
  patch: Partial<Pick<ColorStop, 't' | 'color' | 'alpha'>>,
): ColorStop[] {
  return sortStops(
    stops.map((s) =>
      s.id === id
        ? { ...s, ...patch, t: patch.t != null ? Math.max(0, Math.min(1, patch.t)) : s.t }
        : s,
    ),
  )
}
