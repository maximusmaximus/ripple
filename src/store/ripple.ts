import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  PALETTES,
  PALETTE_ORDER,
  resolveColors,
  resolvePair,
  stopsFromColors,
  addStop as addStopHelper,
  removeStop as removeStopHelper,
  updateStop as updateStopHelper,
  resampleStops,
  defaultStopsFor,
  MAX_COLOR_STOPS,
  type PaletteId,
  type ColorPair,
  type ColorStop,
} from "@/lib/ripple/palettes";
import { getBrush, type BrushId } from "@/lib/ripple/brushes";
import { asFxList, toggleBrushFx, type BrushFxId } from "@/lib/ripple/blend";

export type WorldId = PaletteId;

export interface ColorRange {
  start: number;
  end: number;
}

interface RippleState {
  worldId: WorldId;
  colorRanges: Partial<Record<WorldId, ColorRange>>;
  colorPairs: Partial<Record<WorldId, ColorPair>>;
  /** Per-world extra gradient stops (on top of the 6-stop ramp). */
  colorStops: Partial<Record<WorldId, ColorStop[]>>;

  viscosity: number;
  waveStrength: number;
  /** Brush diameter in normalized units (0.01 – 0.12). */
  brushDiameter: number;
  /** Active brush preset. */
  brushId: BrushId;
  /** Per-brush mix with bed + camera. One or more compatible modes. */
  brushFx: Partial<Record<BrushId, BrushFxId | BrushFxId[]>>;
  /** 0–1 strength of the selected Brush FX. */
  brushFxOpacity: number;
  /** 0 = camera is a flat bed; 1 = strokes warp and pull the camera through. */
  cameraInteract: number;
  /** 0–1.5 — how hard the mic throbs painted marks. */
  micSensitivity: number;
  /** 0–1.5 — gyro slosh. Default is hot. */
  gyroSensitivity: number;
  clearToken: number;
  castPinned: boolean;
  dockOpen: boolean;

  setWorld: (id: WorldId) => void;
  nextWorld: () => void;
  prevWorld: () => void;
  setColorRange: (range: ColorRange) => void;
  setKeyColor: (hex: string) => void;
  setShadowColor: (hex: string) => void;
  resetColorRange: () => void;
  getActiveStops: () => ColorStop[];
  addColorStop: () => void;
  removeColorStop: (id: string) => void;
  updateColorStop: (id: string, patch: Partial<Pick<ColorStop, "t" | "color" | "alpha">>) => void;
  resetColorStops: () => void;
  setViscosity: (v: number) => void;
  setWaveStrength: (v: number) => void;
  setBrushDiameter: (v: number) => void;
  setBrushId: (id: BrushId) => void;
  setBrushFx: (id: BrushFxId) => void;
  getActiveBrushFx: () => BrushFxId[];
  setBrushFxOpacity: (v: number) => void;
  setCameraInteract: (v: number) => void;
  setMicSensitivity: (v: number) => void;
  setGyroSensitivity: (v: number) => void;
  clearSurface: () => void;
  setCastPinned: (v: boolean) => void;
  setDockOpen: (v: boolean) => void;

  getActiveRange: () => ColorRange;
  getActivePair: () => ColorPair;
  getActiveColors: () => string[];
  getActivePalette: () => (typeof PALETTES)[PaletteId];
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function normalizeRange(r: ColorRange): ColorRange {
  let start = clamp01(r.start);
  let end = clamp01(r.end);
  const MIN = 0.04;
  if (Math.abs(end - start) < MIN) {
    if (start + MIN <= 1) end = start + MIN;
    else start = end - MIN;
  }
  return { start, end };
}

function worldPatch(id: WorldId) {
  const p = PALETTES[id] ?? PALETTES.lens;
  const brush = getBrush(p.brushId);
  return {
    worldId: p.id,
    viscosity: p.viscosity,
    waveStrength: p.waveStrength,
    cameraInteract: p.cameraMix,
    micSensitivity: p.micDrive,
    gyroSensitivity: p.gyroDrive,
    brushId: p.brushId,
    brushDiameter: Math.max(0.01, Math.min(0.12, brush.radius * 2)),
    brushFxOpacity: p.brushFxOpacity,
  };
}

const noopStorage = {
  getItem: () => null as string | null,
  setItem: () => {},
  removeItem: () => {},
};

function liveStorage() {
  if (typeof window === "undefined") return noopStorage;
  try {
    const probe = "__ripple_ls";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return noopStorage;
  }
}

export const useRippleStore = create<RippleState>()(
  persist(
    (set, get) => ({
      worldId: "lens",
      colorRanges: {},
      colorPairs: {},
      colorStops: {},
      viscosity: PALETTES.lens.viscosity,
      waveStrength: PALETTES.lens.waveStrength,
      brushDiameter: getBrush(PALETTES.lens.brushId).radius * 2,
      brushId: PALETTES.lens.brushId,
      brushFx: { [PALETTES.lens.brushId]: PALETTES.lens.brushFx },
      brushFxOpacity: PALETTES.lens.brushFxOpacity,
      cameraInteract: PALETTES.lens.cameraMix,
      micSensitivity: PALETTES.lens.micDrive,
      gyroSensitivity: PALETTES.lens.gyroDrive,
      clearToken: 0,
      castPinned: false,
      dockOpen: true,

      setWorld: (id) =>
        set((s) => {
          const patch = worldPatch(id);
          const p = PALETTES[id] ?? PALETTES.lens;
          return {
            ...patch,
            brushFx: { ...s.brushFx, [p.brushId]: p.brushFx },
          };
        }),

      nextWorld: () => {
        const { worldId } = get();
        const i = PALETTE_ORDER.indexOf(worldId);
        const next = PALETTE_ORDER[(i + 1 + PALETTE_ORDER.length) % PALETTE_ORDER.length]!;
        get().setWorld(next);
      },

      prevWorld: () => {
        const { worldId } = get();
        const i = PALETTE_ORDER.indexOf(worldId);
        const prev = PALETTE_ORDER[(i - 1 + PALETTE_ORDER.length) % PALETTE_ORDER.length]!;
        get().setWorld(prev);
      },

      setColorRange: (range) => {
        const { worldId, colorRanges } = get();
        set({
          colorRanges: {
            ...colorRanges,
            [worldId]: normalizeRange(range),
          },
        });
      },

      setKeyColor: (hex) => {
        const { worldId, colorPairs } = get();
        const palette = PALETTES[worldId] ?? PALETTES.lens;
        const prev = resolvePair(palette, colorPairs[worldId]);
        set({
          colorPairs: {
            ...colorPairs,
            [worldId]: { key: hex, shadow: prev.shadow },
          },
        });
      },

      setShadowColor: (hex) => {
        const { worldId, colorPairs } = get();
        const palette = PALETTES[worldId] ?? PALETTES.lens;
        const prev = resolvePair(palette, colorPairs[worldId]);
        set({
          colorPairs: {
            ...colorPairs,
            [worldId]: { key: prev.key, shadow: hex },
          },
        });
      },

      resetColorRange: () => {
        const { worldId, colorRanges, colorPairs, colorStops } = get();
        const nextRanges = { ...colorRanges };
        const nextPairs = { ...colorPairs };
        const nextStops = { ...colorStops };
        delete nextRanges[worldId];
        delete nextPairs[worldId];
        delete nextStops[worldId];
        set({ colorRanges: nextRanges, colorPairs: nextPairs, colorStops: nextStops });
      },

      getActiveStops: () => {
        const { worldId, colorStops, colorPairs } = get();
        const saved = colorStops[worldId];
        if (saved && saved.length >= 2) return saved;
        const palette = PALETTES[worldId] ?? PALETTES.lens;
        return defaultStopsFor(palette, colorPairs[worldId]);
      },

      addColorStop: () => {
        const { worldId, colorStops } = get();
        const current = get().getActiveStops();
        if (current.length >= MAX_COLOR_STOPS) return;
        set({
          colorStops: {
            ...colorStops,
            [worldId]: addStopHelper(current),
          },
        });
      },

      removeColorStop: (id) => {
        const { worldId, colorStops } = get();
        const current = get().getActiveStops();
        set({
          colorStops: {
            ...colorStops,
            [worldId]: removeStopHelper(current, id),
          },
        });
      },

      updateColorStop: (id, patch) => {
        const { worldId, colorStops } = get();
        const current = get().getActiveStops();
        set({
          colorStops: {
            ...colorStops,
            [worldId]: updateStopHelper(current, id, patch),
          },
        });
      },

      resetColorStops: () => {
        const { worldId, colorStops } = get();
        const next = { ...colorStops };
        delete next[worldId];
        set({ colorStops: next });
      },

      setViscosity: (v) => set({ viscosity: Math.max(0.85, Math.min(0.999, v)) }),
      setWaveStrength: (v) => set({ waveStrength: Math.max(0.1, Math.min(1.5, v)) }),
      setBrushDiameter: (v) => set({ brushDiameter: Math.max(0.01, Math.min(0.12, v)) }),
      setBrushId: (id) => {
        const b = getBrush(id);
        set({ brushId: b.id, brushDiameter: Math.max(0.01, Math.min(0.12, b.radius * 2)) });
      },
      setBrushFx: (fx) => {
        const { brushId, brushFx } = get();
        const current = asFxList(brushFx[brushId]);
        set({
          brushFx: {
            ...brushFx,
            [brushId]: toggleBrushFx(current, fx),
          },
        });
      },
      getActiveBrushFx: () => {
        const { brushId, brushFx } = get();
        return asFxList(brushFx[brushId]);
      },
      setBrushFxOpacity: (v) => set({ brushFxOpacity: Math.max(0, Math.min(1, v)) }),
      setCameraInteract: (v) => set({ cameraInteract: Math.max(0, Math.min(1, v)) }),
      setMicSensitivity: (v) => set({ micSensitivity: Math.max(0, Math.min(1.5, v)) }),
      setGyroSensitivity: (v) => set({ gyroSensitivity: Math.max(0, Math.min(1.5, v)) }),
      clearSurface: () => set((s) => ({ clearToken: s.clearToken + 1 })),
      setCastPinned: (v) => set({ castPinned: v }),
      setDockOpen: (v) => set({ dockOpen: v }),

      getActiveRange: () => {
        const { worldId, colorRanges } = get();
        const saved = colorRanges[worldId];
        if (saved) return saved;
        const def = PALETTES[worldId]?.defaultRange ?? [0, 1];
        return { start: def[0], end: def[1] };
      },

      getActivePair: () => {
        const { worldId, colorPairs } = get();
        const palette = PALETTES[worldId] ?? PALETTES.lens;
        return resolvePair(palette, colorPairs[worldId]);
      },

      getActiveColors: () => {
        const { worldId, colorPairs, colorStops } = get();
        const palette = PALETTES[worldId] ?? PALETTES.lens;
        const saved = colorStops[worldId];
        if (saved && saved.length >= 2) return resampleStops(saved, 6);
        return resolveColors(palette, colorPairs[worldId]);
      },

      getActivePalette: () => {
        const { worldId } = get();
        return PALETTES[worldId] ?? PALETTES.lens;
      },
    }),
    {
      name: "ripple-world-v3",
      storage: createJSONStorage(() => liveStorage()),
      partialize: (s) => ({
        worldId: s.worldId,
        colorRanges: s.colorRanges,
        colorPairs: s.colorPairs,
        colorStops: s.colorStops,
        viscosity: s.viscosity,
        waveStrength: s.waveStrength,
        brushDiameter: s.brushDiameter,
        brushId: s.brushId,
        brushFx: s.brushFx,
        brushFxOpacity: s.brushFxOpacity,
        cameraInteract: s.cameraInteract,
        micSensitivity: s.micSensitivity,
        gyroSensitivity: s.gyroSensitivity,
      }),
    },
  ),
);
