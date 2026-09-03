export const PIN_IDS = [
  "viscosity",
  "wave",
  "cam-interact",
  "mic-sens",
  "gyro-sens",
  "gyro-zoom",
  "fx-opacity",
] as const;

export type PinId = (typeof PIN_IDS)[number];

export const MAX_PINS = 2;

export type PinMeta = {
  label: string;
  short: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
};

function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

export const PIN_META: Record<PinId, PinMeta> = {
  viscosity: {
    label: "Viscosity",
    short: "VISC",
    min: 0.85,
    max: 0.999,
    step: 0.001,
    format: (v) => v.toFixed(2),
  },
  wave: {
    label: "Wave strength",
    short: "WAVE",
    min: 0.1,
    max: 1.5,
    step: 0.01,
    format: (v) => v.toFixed(2),
  },
  "cam-interact": {
    label: "Camera interact",
    short: "CAM",
    min: 0,
    max: 1,
    step: 0.01,
    format: pct,
  },
  "mic-sens": {
    label: "Mic sensitivity",
    short: "MIC",
    min: 0,
    max: 1.5,
    step: 0.01,
    format: pct,
  },
  "gyro-sens": {
    label: "Gyro sensitivity",
    short: "GYRO",
    min: 0,
    max: 1,
    step: 0.01,
    format: pct,
  },
  "gyro-zoom": {
    label: "Gyro zoom",
    short: "ZOOM",
    min: 0,
    max: 1.5,
    step: 0.01,
    format: pct,
  },
  "fx-opacity": {
    label: "FX opacity",
    short: "FX",
    min: 0,
    max: 1,
    step: 0.01,
    format: pct,
  },
};

const PIN_SET = new Set<string>(PIN_IDS);

export function isPinId(id: unknown): id is PinId {
  return typeof id === "string" && PIN_SET.has(id);
}

/** Keep at most two unique known ids, first-pinned first. */
export function asPinnedSliders(raw: unknown): PinId[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<PinId>();
  const out: PinId[] = [];
  for (const id of raw) {
    if (!isPinId(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_PINS) break;
  }
  return out;
}

/**
 * Toggle if already pinned. Otherwise append, or replace the last pin
 * when the two slots are full — the older pin stays.
 */
export function nextPinnedSliders(current: readonly PinId[], id: PinId): PinId[] {
  if (current.includes(id)) return current.filter((x) => x !== id);
  if (current.length < MAX_PINS) return [...current, id];
  return [current[0]!, id];
}
