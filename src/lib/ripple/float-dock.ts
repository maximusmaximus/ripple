export const FLOAT_DOCK_KEY = "ripple-float-dock";
export const TABLET_MIN_WIDTH = 768;
export const TABLET_MIN_HEIGHT = 560;
export const FLOAT_DEFAULT_X = 16;
export const FLOAT_DEFAULT_Y = 76;
export const FLOAT_MARGIN = 8;
export const FLOAT_PANEL_WIDTH = 352;
export const FLOAT_STEPPER = 52;
export const FLOAT_FAB_SIZE = 70;

export type DockPoint = { x: number; y: number };

/** Wide + tall + coarse (no mouse hover). iPhone landscape is wide but short. */
export function isTabletViewport(input: {
  width: number;
  height: number;
  finePointer: boolean;
  hover: boolean;
}): boolean {
  const wide = input.width >= TABLET_MIN_WIDTH;
  const tall = input.height >= TABLET_MIN_HEIGHT;
  const desktop = input.finePointer && input.hover;
  return wide && tall && !desktop;
}

export function floatPanelSize(vw: number, vh: number): { width: number; height: number } {
  const width = Math.min(FLOAT_PANEL_WIDTH + FLOAT_STEPPER, Math.max(220, vw - FLOAT_MARGIN * 2));
  const height = Math.min(vh * 0.7, Math.max(220, vh - 128));
  return { width, height };
}

export function defaultFloatPos(vw: number, vh: number): DockPoint {
  const size = floatPanelSize(vw, vh);
  return clampFloatPos({ x: FLOAT_DEFAULT_X, y: FLOAT_DEFAULT_Y }, { vw, vh, ...size });
}

export function clampFloatPos(
  pos: DockPoint,
  box: { vw: number; vh: number; width: number; height: number },
): DockPoint {
  const maxX = Math.max(FLOAT_MARGIN, box.vw - box.width - FLOAT_MARGIN);
  const maxY = Math.max(FLOAT_MARGIN, box.vh - box.height - FLOAT_MARGIN);
  return {
    x: Math.min(maxX, Math.max(FLOAT_MARGIN, pos.x)),
    y: Math.min(maxY, Math.max(FLOAT_MARGIN, pos.y)),
  };
}

export function parseFloatDockPos(raw: unknown): DockPoint | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as { x?: unknown; y?: unknown };
  if (typeof rec.x !== "number" || typeof rec.y !== "number") return null;
  if (!Number.isFinite(rec.x) || !Number.isFinite(rec.y)) return null;
  return { x: rec.x, y: rec.y };
}

export function loadFloatDockPos(): DockPoint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(FLOAT_DOCK_KEY);
    if (!raw) return null;
    return parseFloatDockPos(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveFloatDockPos(pos: DockPoint) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(FLOAT_DOCK_KEY, JSON.stringify({ x: pos.x, y: pos.y }));
  } catch {
    /* private mode */
  }
}
