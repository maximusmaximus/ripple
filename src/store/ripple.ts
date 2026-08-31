import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  PALETTES,
  PALETTE_ORDER,
  resolveColors,
  resolvePair,
  addStop as addStopHelper,
  removeStop as removeStopHelper,
  updateStop as updateStopHelper,
  resampleStops,
  defaultStopsFor,
  flipStops,
  ensureShadowStop,
  isShadowStop,
  stopAlpha,
  MAX_COLOR_STOPS,
  type PaletteId,
  type ColorPair,
  type ColorStop,
} from "@/lib/ripple/palettes";
import { getBrush, isCustomBrushId, MAX_CUSTOM_BRUSHES, defaultBrushSpan, defaultShadowSpan, defaultShapeFor, normalizeBrushShape, normalizeBrushSpan, type BrushShape, type BrushSpan, type CustomBrush } from "@/lib/ripple/brushes";
import { asFxList, asFxLayers, toggleBrushFx, toggleFxLayer as toggleFxLayerHelper, type BrushFxId, type FxLayerId } from "@/lib/ripple/blend";
import { DEFAULT_TEXTURE_ID, getTexture, type TextureId } from "@/lib/ripple/textures";
import { hasMediaPayload, type CustomTexture, type StudioSnapshot, type TextureFit } from "@/lib/ripple/studio";

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
  /** Brush diameter in normalized units (0.01 – 0.12). Kept as the large end of the live span. */
  brushDiameter: number;
  /** Per-brush small/large mark size. Tail interpolates between them along a stroke. */
  brushSpan: Partial<Record<string, BrushSpan>>;
  brushShape: Partial<Record<string, BrushShape>>;
  /** Active brush preset (builtin id or cb_*). */
  brushId: string;
  /** Per-brush mix with bed + camera. One or more compatible modes. */
  brushFx: Partial<Record<string, BrushFxId | BrushFxId[]>>;
  /** 0–1 strength of the selected Brush FX. */
  brushFxOpacity: number;
  /** Which layers inherit the FX stack. Empty = collapsed / idle. */
  fxLayers: FxLayerId[];
  shadowOn: boolean;
  shadowColor: string;
  shadowAngle: number;
  shadowOpacity: number;
  /** 0–1 user scale for how far the cast sits from the mark. */
  shadowDist: number;
  /** Start / belly / tail width of the brush shadow. */
  shadowSpan: BrushSpan;
  textureId: TextureId;
  textureFit: TextureFit;
  customTexture: CustomTexture | null;
  /** Object URL for an animated GIF while this session is open. Not persisted. */
  customLiveUrl: string | null;
  customBrushes: CustomBrush[];
  /** 0 = original photo, 1 = hard black/white threshold. Image-only. */
  textureLevels: number;
  textureInvert: boolean;
  gradientFlip: boolean;
  /** 0 = camera is a flat bed; 1 = strokes warp and pull the camera through. */
  cameraInteract: number;
  /** 0–1 camera bed opacity. 1 = opaque feed, 0 = fully transparent. */
  cameraOpacity: number;
  /** Preset asked for the camera — chrome should request permission. */
  cameraWanted: boolean;
  /** 0–1.5 — how hard the mic throbs painted marks. */
  micSensitivity: number;
  /** 0–1 — gyro slosh. 70% is the quiet default (90% less than the old mix). */
  gyroSensitivity: number;
  /** 0–1.5 — how hard tilt punches the camera in. Independent of slosh. */
  gyroZoom: number;
  clearToken: number;
  castPinned: boolean;
  dockOpen: boolean;
  tipsOn: boolean;
  openTipId: string | null;
  hiddenPresetIds: string[];
  hiddenBrushIds: string[];

  setWorld: (id: WorldId) => void;
  nextWorld: () => void;
  prevWorld: () => void;
  setColorRange: (range: ColorRange) => void;
  setKeyColor: (hex: string) => void;
  setShadowColor: (hex: string) => void;
  resetColorRange: () => void;
  getActiveStops: () => ColorStop[];
  addColorStop: (t?: number) => string | null;
  removeColorStop: (id: string) => void;
  updateColorStop: (id: string, patch: Partial<Pick<ColorStop, "t" | "color" | "alpha">>) => void;
  resetColorStops: () => void;
  setViscosity: (v: number) => void;
  setWaveStrength: (v: number) => void;
  setBrushDiameter: (v: number) => void;
  setBrushSpan: (span: BrushSpan) => void;
  getActiveSpan: () => BrushSpan;
  setBrushShape: (shape: Partial<BrushShape>) => void;
  getActiveShape: () => BrushShape;
  setBrushId: (id: string) => void;
  addCustomBrush: (brush: CustomBrush) => void;
  updateCustomBrush: (id: string, patch: Partial<Pick<CustomBrush, "name" | "angle" | "spin" | "markWidth">>) => void;
  removeCustomBrush: (id: string) => void;
  setBrushFx: (id: BrushFxId) => void;
  getActiveBrushFx: () => BrushFxId[];
  setBrushFxOpacity: (v: number) => void;
  toggleFxLayer: (id: FxLayerId) => void;
  getActiveFxLayers: () => FxLayerId[];
  setShadowOn: (v: boolean) => void;
  setBrushShadowColor: (hex: string) => void;
  setShadowAngle: (deg: number) => void;
  setShadowOpacity: (v: number) => void;
  setShadowDist: (v: number) => void;
  setShadowSpan: (span: BrushSpan) => void;
  setTextureId: (id: TextureId) => void;
  setTextureFit: (fit: TextureFit) => void;
  setTextureLevels: (v: number) => void;
  setTextureInvert: (v: boolean) => void;
  setGradientFlip: (v: boolean) => void;
  setCustomTexture: (tex: CustomTexture | null, liveUrl?: string | null) => void;
  resetCustomImage: () => void;
  takeSnapshot: () => StudioSnapshot;
  applySnapshot: (snap: StudioSnapshot) => void;
  cleanSession: () => void;
  setCameraInteract: (v: number) => void;
  setCameraOpacity: (v: number) => void;
  setCameraWanted: (v: boolean) => void;
  setMicSensitivity: (v: number) => void;
  setGyroSensitivity: (v: number) => void;
  setGyroZoom: (v: number) => void;
  clearSurface: () => void;
  setCastPinned: (v: boolean) => void;
  setDockOpen: (v: boolean) => void;
  setTipsOn: (v: boolean) => void;
  setOpenTip: (id: string | null) => void;
  hidePreset: (id: string) => void;
  hideBrush: (id: string) => void;

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
  } catch {
    return noopStorage;
  }
  const ls = window.localStorage;
  return {
    getItem: (key: string) => {
      try {
        return ls.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        ls.setItem(key, value);
        return;
      } catch {
        /* QuotaExceeded — drop heavy dataUrls and retry so persist never crashes the studio. */
      }
      try {
        const parsed = JSON.parse(value) as { state?: Record<string, unknown> };
        const state: Record<string, unknown> = parsed.state ?? parsed;
        const tex = state.customTexture as { dataUrl?: string; path?: string } | null | undefined;
        if (tex && tex.dataUrl && tex.dataUrl.length > 64) {
          state.customTexture = { ...tex, dataUrl: tex.path ? "" : tex.dataUrl.slice(0, 64) };
        }
        const brushes = state.customBrushes as { dataUrl?: string; path?: string }[] | undefined;
        if (Array.isArray(brushes)) {
          state.customBrushes = brushes.map((b) =>
            b.dataUrl && b.dataUrl.length > 80_000 ? { ...b, dataUrl: b.path ? "" : b.dataUrl.slice(0, 64) } : b,
          );
        }
        ls.setItem(key, JSON.stringify(parsed));
      } catch {
        try {
          ls.removeItem(key);
        } catch {
          /* ignore */
        }
      }
    },
    removeItem: (key: string) => {
      try {
        ls.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
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
      brushSpan: {},
      brushShape: {},
      brushId: PALETTES.lens.brushId,
      brushFx: { [PALETTES.lens.brushId]: PALETTES.lens.brushFx },
      brushFxOpacity: PALETTES.lens.brushFxOpacity,
      fxLayers: ["brush"],
      shadowOn: false,
      shadowColor: "#0a0810",
      shadowAngle: 135,
      shadowOpacity: 0.45,
      shadowDist: 0.35,
      shadowSpan: defaultShadowSpan(),
      textureId: DEFAULT_TEXTURE_ID,
      textureFit: "cover",
      customTexture: null,
      customLiveUrl: null,
      customBrushes: [],
      textureLevels: 0,
      textureInvert: false,
      gradientFlip: false,
      cameraInteract: PALETTES.lens.cameraMix,
      cameraOpacity: 1,
      cameraWanted: false,
      micSensitivity: PALETTES.lens.micDrive,
      gyroSensitivity: PALETTES.lens.gyroDrive,
      gyroZoom: 0.55,
      clearToken: 0,
      castPinned: false,
      dockOpen: false,
      tipsOn: false,
      openTipId: null,
      hiddenPresetIds: [],
      hiddenBrushIds: [],

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
        set({ colorRanges: nextRanges, colorPairs: nextPairs, colorStops: nextStops, gradientFlip: false });
      },

      getActiveStops: () => {
        const { worldId, colorStops, colorPairs, shadowColor, shadowOpacity } = get();
        const saved = colorStops[worldId];
        const palette = PALETTES[worldId] ?? PALETTES.lens;
        const base = saved && saved.length >= 2 ? saved : defaultStopsFor(palette, colorPairs[worldId]);
        return ensureShadowStop(base, shadowColor, shadowOpacity);
      },

      addColorStop: (t) => {
        const { worldId, colorStops } = get();
        const current = get().getActiveStops();
        if (current.length >= MAX_COLOR_STOPS) return null;
        const next = addStopHelper(current, undefined, t);
        const added = next.find((s) => !current.some((c) => c.id === s.id));
        set({
          colorStops: {
            ...colorStops,
            [worldId]: next,
          },
        });
        return added?.id ?? null;
      },

      removeColorStop: (id) => {
        const { worldId, colorStops } = get();
        if (isShadowStop({ id, t: 0, color: "#000" })) return;
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
        const next = updateStopHelper(current, id, patch);
        const sh = next.find(isShadowStop);
        set({
          colorStops: {
            ...colorStops,
            [worldId]: next,
          },
          ...(sh
            ? {
                shadowColor: sh.color,
                shadowOpacity: stopAlpha(sh),
              }
            : {}),
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
      setBrushDiameter: (v) => {
        const id = get().brushId;
        const b = getBrush(id, get().customBrushes);
        const prev = get().brushSpan[id] ?? defaultBrushSpan(b.radius);
        const span = normalizeBrushSpan({ ...prev, start: v });
        set({ brushDiameter: span.start, brushSpan: { ...get().brushSpan, [id]: span } });
      },
      setBrushSpan: (span) => {
        const id = get().brushId;
        const next = normalizeBrushSpan(span);
        set({ brushDiameter: next.start, brushSpan: { ...get().brushSpan, [id]: next } });
      },
      getActiveSpan: () => {
        const s = get();
        const b = getBrush(s.brushId, s.customBrushes);
        return normalizeBrushSpan(s.brushSpan[s.brushId] ?? defaultBrushSpan(b.radius));
      },
      setBrushShape: (shape) => {
        const id = get().brushId;
        const b = getBrush(id, get().customBrushes);
        const custom = get().customBrushes.find((c) => c.id === id);
        const fallback = custom ? defaultShapeFor(custom) : defaultShapeFor(b);
        const next = normalizeBrushShape({ ...get().brushShape[id], ...shape }, fallback);
        if (custom) {
          get().updateCustomBrush(id, { angle: next.angle, markWidth: next.width, spin: next.spin });
        }
        set({ brushShape: { ...get().brushShape, [id]: next } });
      },
      getActiveShape: () => {
        const s = get();
        const b = getBrush(s.brushId, s.customBrushes);
        const custom = s.customBrushes.find((c) => c.id === s.brushId);
        const fallback = custom ? defaultShapeFor(custom) : defaultShapeFor(b);
        const next = normalizeBrushShape(s.brushShape[s.brushId], fallback);
        const cached = s.brushShape[s.brushId];
        if (
          cached &&
          cached.angle === next.angle &&
          cached.width === next.width &&
          cached.spin === next.spin
        ) {
          return cached;
        }
        return next;
      },
      setBrushId: (id) => {
        const customs = get().customBrushes;
        const b = getBrush(id, customs);
        const nextId = isCustomBrushId(id) && customs.some((c) => c.id === id) ? id : b.id;
        const span = get().brushSpan[nextId] ?? defaultBrushSpan(b.radius);
        set({
          brushId: nextId,
          brushDiameter: span.start,
          brushSpan: { ...get().brushSpan, [nextId]: span },
        });
      },
      addCustomBrush: (brush) => {
        const list = get().customBrushes;
        if (list.length >= MAX_CUSTOM_BRUSHES) return;
        if (list.some((c) => c.id === brush.id)) return;
        const shape = defaultShapeFor(brush);
        set({
          customBrushes: [...list, { ...brush, markWidth: shape.width }],
          brushId: brush.id,
          brushDiameter: 0.06,
          brushSpan: { ...get().brushSpan, [brush.id]: { start: 0.06, mid: 0.04, end: 0.02 } },
          brushShape: { ...get().brushShape, [brush.id]: shape },
        });
      },
      updateCustomBrush: (id, patch) => {
        set({
          customBrushes: get().customBrushes.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        });
      },
      removeCustomBrush: (id) => {
        const next = get().customBrushes.filter((c) => c.id !== id);
        const brushId = get().brushId === id ? getBrush(undefined).id : get().brushId;
        set({ customBrushes: next, brushId });
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
      toggleFxLayer: (id) => {
        const current = asFxLayers(get().fxLayers);
        const next = toggleFxLayerHelper(current, id);
        set({
          fxLayers: next,
        });
      },
      getActiveFxLayers: () => asFxLayers(get().fxLayers),
      setShadowOn: (v) => set({ shadowOn: v }),
      setBrushShadowColor: (hex) => {
        const { worldId, colorStops } = get();
        const current = get().getActiveStops();
        const next = updateStopHelper(current, "brush-shadow", { color: hex });
        set({
          shadowColor: hex,
          colorStops: { ...colorStops, [worldId]: next },
        });
      },
      setShadowAngle: (deg) => set({ shadowAngle: ((deg % 360) + 360) % 360 }),
      setShadowOpacity: (v) => {
        const opacity = Math.max(0, Math.min(1, v));
        const { worldId, colorStops } = get();
        const current = get().getActiveStops();
        const next = updateStopHelper(current, "brush-shadow", { alpha: opacity });
        set({
          shadowOpacity: opacity,
          colorStops: { ...colorStops, [worldId]: next },
        });
      },
      setShadowDist: (v) => set({ shadowDist: Math.max(0, Math.min(1, v)) }),
      setShadowSpan: (span) => set({ shadowSpan: normalizeBrushSpan(span) }),
      setTextureId: (id) =>
        set((s) => {
          const next = getTexture(id).id;
          if (next === "custom" && !s.customTexture) return s;
          return { textureId: next };
        }),
      setTextureFit: (fit) => set({ textureFit: fit }),
      setTextureLevels: (v) => set({ textureLevels: Math.max(0, Math.min(1, v)) }),
      setTextureInvert: (v) => set({ textureInvert: v }),
      setGradientFlip: (v) =>
        set((s) => {
          if (s.gradientFlip === v) return s;
          const palette = PALETTES[s.worldId] ?? PALETTES.lens;
          const saved = s.colorStops[s.worldId];
          const current =
            saved && saved.length >= 2 ? saved : defaultStopsFor(palette, s.colorPairs[s.worldId]);
          const range = s.colorRanges[s.worldId];
          const start = range ? range.start : palette.defaultRange[0];
          const end = range ? range.end : palette.defaultRange[1];
          return {
            gradientFlip: v,
            colorStops: { ...s.colorStops, [s.worldId]: flipStops(current) },
            colorRanges: {
              ...s.colorRanges,
              [s.worldId]: { start: 1 - end, end: 1 - start },
            },
          };
        }),
      setCustomTexture: (tex, liveUrl) =>
        set((s) => {
          if (s.customLiveUrl && s.customLiveUrl !== liveUrl) {
            try {
              URL.revokeObjectURL(s.customLiveUrl);
            } catch {
              /* ignore */
            }
          }
          return {
            customTexture: tex,
            customLiveUrl: tex ? (liveUrl ?? null) : null,
            textureId: tex ? "custom" : DEFAULT_TEXTURE_ID,
            textureFit: tex ? "cover" : s.textureFit,
            textureLevels: 0,
          };
        }),
      resetCustomImage: () => set({ textureFit: "cover", textureLevels: 0 }),
      takeSnapshot: () => {
        const s = get();
        return {
          worldId: s.worldId,
          colorRanges: s.colorRanges,
          colorPairs: s.colorPairs,
          colorStops: s.colorStops,
          viscosity: s.viscosity,
          waveStrength: s.waveStrength,
          brushDiameter: s.brushDiameter,
          brushSpan: s.brushSpan,
          brushShape: s.brushShape,
          brushId: s.brushId,
          brushFx: s.brushFx,
          brushFxOpacity: s.brushFxOpacity,
          fxLayers: s.fxLayers,
          shadowOn: s.shadowOn,
          shadowColor: s.shadowColor,
          shadowAngle: s.shadowAngle,
          shadowOpacity: s.shadowOpacity,
          shadowDist: s.shadowDist,
          shadowSpan: s.shadowSpan,
          textureId: s.textureId,
          textureFit: s.textureFit,
          customTexture: s.customTexture,
          textureLevels: s.textureLevels,
          textureInvert: s.textureInvert,
          gradientFlip: s.gradientFlip,
          cameraInteract: s.cameraInteract,
          cameraOpacity: s.cameraOpacity,
          micSensitivity: s.micSensitivity,
          gyroSensitivity: s.gyroSensitivity,
          gyroZoom: s.gyroZoom,
          customBrushes: s.customBrushes.map((c) => ({
            ...c,
            name: c.name.trim() || "Stamp",
            markWidth: typeof c.markWidth === "number" ? c.markWidth : 1,
          })),
        };
      },
      applySnapshot: (snap) => {
        const incoming = Array.isArray(snap.customBrushes) ? snap.customBrushes : [];
        const byId = new Map(get().customBrushes.map((c) => [c.id, c]));
        for (const c of incoming) byId.set(c.id, c);
        const customs = [...byId.values()].slice(0, MAX_CUSTOM_BRUSHES);
        const brush = getBrush(snap.brushId, customs);
        const keepCustom = isCustomBrushId(snap.brushId) && customs.some((c) => c.id === snap.brushId);
        const prevLive = get().customLiveUrl;
        if (prevLive) {
          try {
            URL.revokeObjectURL(prevLive);
          } catch {
            /* ignore */
          }
        }
        const custom = snap.customTexture && hasMediaPayload(snap.customTexture) ? snap.customTexture : null;
        const texId = custom ? getTexture(snap.textureId).id : getTexture(snap.textureId === "custom" ? DEFAULT_TEXTURE_ID : snap.textureId).id;
        set({
          worldId: snap.worldId,
          colorRanges: snap.colorRanges ?? {},
          colorPairs: snap.colorPairs ?? {},
          colorStops: snap.colorStops ?? {},
          viscosity: snap.viscosity,
          waveStrength: snap.waveStrength,
          brushDiameter: snap.brushDiameter ?? Math.max(0.01, Math.min(0.12, brush.radius * 2)),
          brushSpan: snap.brushSpan ?? {},
          brushShape: snap.brushShape ?? {},
          brushId: keepCustom ? snap.brushId : brush.id,
          brushFx: snap.brushFx ?? { [brush.id]: PALETTES[snap.worldId]?.brushFx ?? ["normal"] },
          brushFxOpacity: snap.brushFxOpacity,
          fxLayers: asFxLayers(snap.fxLayers),
          shadowOn: Boolean(snap.shadowOn),
          shadowColor: snap.shadowColor,
          shadowAngle: snap.shadowAngle,
          shadowOpacity: snap.shadowOpacity,
          shadowDist: Math.max(0, Math.min(1, snap.shadowDist ?? 0.35)),
          shadowSpan: normalizeBrushSpan(snap.shadowSpan ?? defaultShadowSpan()),
          textureId: texId === "custom" && !custom ? DEFAULT_TEXTURE_ID : texId,
          textureFit: snap.textureFit === "contain" || snap.textureFit === "stretch" ? snap.textureFit : "cover",
          customTexture: custom,
          customLiveUrl: null,
          textureLevels: Math.max(0, Math.min(1, snap.textureLevels ?? 0)),
          textureInvert: Boolean(snap.textureInvert),
          gradientFlip: Boolean(snap.gradientFlip),
          cameraInteract: snap.cameraInteract,
          cameraOpacity: Math.max(0, Math.min(1, snap.cameraOpacity ?? 1)),
          cameraWanted: false,
          micSensitivity: snap.micSensitivity,
          gyroSensitivity: Math.max(0, Math.min(1, snap.gyroSensitivity > 1 ? 0.7 : snap.gyroSensitivity)),
          gyroZoom: snap.gyroZoom ?? 0.55,
          customBrushes: customs,
        });
      },
      cleanSession: () => {
        const p = PALETTES.lens;
        const brush = getBrush(p.brushId);
        const prevLive = get().customLiveUrl;
        if (prevLive) {
          try {
            URL.revokeObjectURL(prevLive);
          } catch {
            /* ignore */
          }
        }
        set({
          worldId: p.id,
          colorRanges: {},
          colorPairs: {},
          colorStops: {},
          viscosity: p.viscosity,
          waveStrength: p.waveStrength,
          brushDiameter: Math.max(0.01, Math.min(0.12, brush.radius * 2)),
          brushSpan: {},
          brushShape: {},
          brushId: brush.id,
          brushFx: { [brush.id]: p.brushFx },
          brushFxOpacity: p.brushFxOpacity,
          fxLayers: ["brush"],
          shadowOn: false,
          shadowColor: "#0a0810",
          shadowAngle: 135,
          shadowOpacity: 0.45,
          shadowDist: 0.35,
          shadowSpan: defaultShadowSpan(),
          textureId: DEFAULT_TEXTURE_ID,
          textureFit: "cover",
          customTexture: null,
          customLiveUrl: null,
          textureLevels: 0,
          textureInvert: false,
          gradientFlip: false,
          cameraInteract: p.cameraMix,
          cameraOpacity: 1,
          cameraWanted: false,
          micSensitivity: p.micDrive,
          gyroSensitivity: p.gyroDrive,
          gyroZoom: 0.55,
          dockOpen: false,
          clearToken: get().clearToken + 1,
        });
      },
      setCameraInteract: (v) => set({ cameraInteract: Math.max(0, Math.min(1, v)) }),
      setCameraOpacity: (v) => set({ cameraOpacity: Math.max(0, Math.min(1, v)) }),
      setCameraWanted: (v) => set({ cameraWanted: v }),
      setMicSensitivity: (v) => set({ micSensitivity: Math.max(0, Math.min(1.5, v)) }),
      setGyroSensitivity: (v) => set({ gyroSensitivity: Math.max(0, Math.min(1, v)) }),
      setGyroZoom: (v) => set({ gyroZoom: Math.max(0, Math.min(1.5, v)) }),
      clearSurface: () => set((s) => ({ clearToken: s.clearToken + 1 })),
      setCastPinned: (v) => set({ castPinned: v }),
      setDockOpen: (v) => set({ dockOpen: v }),
      setTipsOn: (v) => set({ tipsOn: v, openTipId: v ? "paint" : null }),
      setOpenTip: (id) => set({ openTipId: id }),
      hidePreset: (id) =>
        set((s) => ({
          hiddenPresetIds: s.hiddenPresetIds.includes(id) ? s.hiddenPresetIds : [...s.hiddenPresetIds, id],
        })),
      hideBrush: (id) =>
        set((s) => {
          const hiddenBrushIds = s.hiddenBrushIds.includes(id) ? s.hiddenBrushIds : [...s.hiddenBrushIds, id];
          if (isCustomBrushId(id)) {
            const next = s.customBrushes.filter((c) => c.id !== id);
            const brushId = s.brushId === id ? getBrush(undefined).id : s.brushId;
            return { hiddenBrushIds, customBrushes: next, brushId };
          }
          const brushId = s.brushId === id ? getBrush(undefined).id : s.brushId;
          return { hiddenBrushIds, brushId };
        }),

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
        const stops = get().getActiveStops();
        if (stops.length >= 2) return resampleStops(stops, 6);
        const { worldId, colorPairs } = get();
        const palette = PALETTES[worldId] ?? PALETTES.lens;
        return resolveColors(palette, colorPairs[worldId]);
      },

      getActivePalette: () => {
        const { worldId } = get();
        return PALETTES[worldId] ?? PALETTES.lens;
      },
    }),
    {
      name: "ripple-world-v3",
      skipHydration: true,
      storage: createJSONStorage(() => liveStorage()),
      partialize: (s) => ({
        worldId: s.worldId,
        colorRanges: s.colorRanges,
        colorPairs: s.colorPairs,
        colorStops: s.colorStops,
        viscosity: s.viscosity,
        waveStrength: s.waveStrength,
        brushDiameter: s.brushDiameter,
        brushSpan: s.brushSpan,
        brushShape: s.brushShape,
        brushId: s.brushId,
        brushFx: s.brushFx,
        brushFxOpacity: s.brushFxOpacity,
        fxLayers: s.fxLayers,
        shadowOn: s.shadowOn,
        shadowColor: s.shadowColor,
        shadowAngle: s.shadowAngle,
        shadowOpacity: s.shadowOpacity,
        shadowDist: s.shadowDist,
        shadowSpan: s.shadowSpan,
        textureId: s.textureId,
        textureFit: s.textureFit,
        customTexture: s.customTexture,
        textureLevels: s.textureLevels,
        textureInvert: s.textureInvert,
        gradientFlip: s.gradientFlip,
        cameraInteract: s.cameraInteract,
        cameraOpacity: s.cameraOpacity,
        micSensitivity: s.micSensitivity,
        gyroSensitivity: s.gyroSensitivity,
        gyroCalibrated: true as const,
        gyroQuietV2: true as const,
        gyroZoom: s.gyroZoom,
        customBrushes: s.customBrushes,
        hiddenPresetIds: s.hiddenPresetIds,
        hiddenBrushIds: s.hiddenBrushIds,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<RippleState> & { gyroCalibrated?: boolean; gyroQuietV2?: boolean };
        const fxLayers = asFxLayers(p.fxLayers ?? current.fxLayers);
        let gyroSensitivity = typeof p.gyroSensitivity === "number" ? p.gyroSensitivity : current.gyroSensitivity;
        if (!p.gyroQuietV2) {
          gyroSensitivity = 0.7;
        } else {
          gyroSensitivity = Math.max(0, Math.min(1, gyroSensitivity > 1 ? 0.7 : gyroSensitivity));
        }
        const rawBrushes = Array.isArray(p.customBrushes) ? p.customBrushes : current.customBrushes;
        const customBrushes = rawBrushes.map((c) => ({
          ...c,
          markWidth: typeof c.markWidth === "number" ? c.markWidth : 1,
        }));
        return {
          ...current,
          ...p,
          dockOpen: false,
          gyroSensitivity,
          cameraOpacity: typeof p.cameraOpacity === "number" ? Math.max(0, Math.min(1, p.cameraOpacity)) : current.cameraOpacity,
          cameraWanted: false,
          brushShape: p.brushShape ?? current.brushShape,
          textureInvert: Boolean(p.textureInvert),
          gradientFlip: Boolean(p.gradientFlip),
          fxLayers,
          shadowDist: typeof p.shadowDist === "number" ? Math.max(0, Math.min(1, p.shadowDist)) : current.shadowDist,
          shadowSpan: normalizeBrushSpan(p.shadowSpan ?? current.shadowSpan ?? defaultShadowSpan()),
          customBrushes,
          hiddenPresetIds: Array.isArray((p as { hiddenPresetIds?: string[] }).hiddenPresetIds)
            ? (p as { hiddenPresetIds: string[] }).hiddenPresetIds
            : current.hiddenPresetIds,
          hiddenBrushIds: Array.isArray((p as { hiddenBrushIds?: string[] }).hiddenBrushIds)
            ? (p as { hiddenBrushIds: string[] }).hiddenBrushIds
            : current.hiddenBrushIds,
        };
      },
    },
  ),
);
