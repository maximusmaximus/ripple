import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { PALETTES, PALETTE_ORDER, type PaletteId } from "@/lib/ripple/palettes";

export type WorldId = PaletteId;

export interface ColorRange {
  start: number;
  end: number;
}

interface RippleState {
  worldId: WorldId;
  colorRanges: Partial<Record<WorldId, ColorRange>>;

  viscosity: number;
  waveStrength: number;
  /** Brush diameter in normalized units (0.01 – 0.12). */
  brushDiameter: number;
  clearToken: number;
  castPinned: boolean;
  dockOpen: boolean;

  setWorld: (id: WorldId) => void;
  nextWorld: () => void;
  prevWorld: () => void;
  setColorRange: (range: ColorRange) => void;
  resetColorRange: () => void;
  setViscosity: (v: number) => void;
  setWaveStrength: (v: number) => void;
  setBrushDiameter: (v: number) => void;
  clearSurface: () => void;
  setCastPinned: (v: boolean) => void;
  setDockOpen: (v: boolean) => void;

  getActiveRange: () => ColorRange;
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
  const p = PALETTES[id] ?? PALETTES.abyss;
  return { worldId: id, viscosity: p.viscosity, waveStrength: p.waveStrength };
}

const noopStorage = {
  getItem: () => null as string | null,
  setItem: () => {},
  removeItem: () => {},
};

export const useRippleStore = create<RippleState>()(
  persist(
    (set, get) => ({
      worldId: "abyss",
      colorRanges: {},
      viscosity: PALETTES.abyss.viscosity,
      waveStrength: PALETTES.abyss.waveStrength,
      brushDiameter: 0.04,
      clearToken: 0,
      castPinned: false,
      dockOpen: true,

      setWorld: (id) => set(worldPatch(id)),

      nextWorld: () => {
        const { worldId } = get();
        const i = PALETTE_ORDER.indexOf(worldId);
        set(worldPatch(PALETTE_ORDER[(i + 1) % PALETTE_ORDER.length]!));
      },

      prevWorld: () => {
        const { worldId } = get();
        const i = PALETTE_ORDER.indexOf(worldId);
        set(
          worldPatch(
            PALETTE_ORDER[(i - 1 + PALETTE_ORDER.length) % PALETTE_ORDER.length]!,
          ),
        );
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

      resetColorRange: () => {
        const { worldId, colorRanges } = get();
        const next = { ...colorRanges };
        delete next[worldId];
        set({ colorRanges: next });
      },

      setViscosity: (v) => set({ viscosity: Math.max(0.85, Math.min(0.999, v)) }),
      setWaveStrength: (v) => set({ waveStrength: Math.max(0.1, Math.min(1.5, v)) }),
      setBrushDiameter: (v) => set({ brushDiameter: Math.max(0.01, Math.min(0.12, v)) }),
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

      getActivePalette: () => {
        const { worldId } = get();
        return PALETTES[worldId] ?? PALETTES.abyss;
      },
    }),
    {
      name: "ripple-world-v1",
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : localStorage,
      ),
      partialize: (s) => ({
        worldId: s.worldId,
        colorRanges: s.colorRanges,
        viscosity: s.viscosity,
        waveStrength: s.waveStrength,
        brushDiameter: s.brushDiameter,
      }),
    },
  ),
);
