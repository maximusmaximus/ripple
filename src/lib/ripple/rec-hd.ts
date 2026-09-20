export const REC_HD_KEY = "ripple-rec-hd";
export const REC_HD_EVENT = "ripple-rec-hd";

type Kv = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function defaultStore(): Kv | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

let cached: boolean | null = null;
let recBusy = false;

export function readRecHd(store: Kv | null = defaultStore()): boolean {
  const live = store === defaultStore();
  if (live && cached != null) return cached;
  const on = store?.getItem(REC_HD_KEY) === "on";
  if (live) cached = on;
  return on;
}

export function writeRecHd(value: boolean, store: Kv | null = defaultStore()) {
  const live = store === defaultStore();
  if (live) cached = value;
  try {
    store?.setItem(REC_HD_KEY, value ? "on" : "off");
  } catch {
    /* private mode */
  }
  if (live && typeof window !== "undefined") {
    window.dispatchEvent(new Event(REC_HD_EVENT));
  }
}

export function recHdEnabled(): boolean {
  return cached ?? readRecHd();
}

export function setRecBusy(on: boolean) {
  recBusy = on;
}

export function recIsBusy(): boolean {
  return recBusy;
}

/**
 * Backing-store size for the live canvas.
 * Share stays on today's 2× cap. HD uses this screen's native pixels
 * (device pixel ratio, longest side 4096).
 */
export function canvasPixelSize(
  cssW: number,
  cssH: number,
  hd: boolean,
  dpr = 1,
): { w: number; h: number } {
  const scale = Math.max(1, hd ? dpr : Math.min(dpr, 2));
  let w = Math.max(1, Math.floor(cssW * scale));
  let h = Math.max(1, Math.floor(cssH * scale));
  if (!hd) return { w, h };
  const max = 4096;
  const long = Math.max(w, h);
  if (long > max) {
    const s = max / long;
    w = Math.max(1, Math.floor(w * s));
    h = Math.max(1, Math.floor(h * s));
  }
  return { w, h };
}

