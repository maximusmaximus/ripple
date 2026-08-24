/** Screen orientation angle in degrees (clockwise from portrait-primary). */
export type ScreenAngle = 0 | 90 | 180 | 270;

function readApiAngle(): ScreenAngle {
  if (typeof window === "undefined") return 0;

  const so = window.screen?.orientation;
  if (so && typeof so.angle === "number") {
    return normalizeAngle(so.angle);
  }

  const legacy = (window as Window & { orientation?: number }).orientation;
  if (typeof legacy === "number") {
    return normalizeAngle(legacy);
  }

  return 0;
}

function viewSize(): { w: number; h: number } {
  if (typeof window === "undefined") return { w: 1, h: 1 };
  const vv = window.visualViewport;
  const w = vv?.width || window.innerWidth || 1;
  const h = vv?.height || window.innerHeight || 1;
  return { w, h };
}

/**
 * Device rotation from the Orientation API / legacy window.orientation.
 * Falls back to viewport aspect so a landscape frame still counts when the
 * OS reports angle 0 (desktop, iframes, some iOS webviews).
 */
export function getScreenAngle(): ScreenAngle {
  const api = readApiAngle();
  if (api === 90 || api === 180 || api === 270) return api;
  const { w, h } = viewSize();
  return w > h ? 90 : 0;
}

/**
 * Align the camera's long axis with the viewport's long axis.
 *
 * Phone/webcam frames are often landscape pixels even in a portrait window.
 * `screen.orientation.angle` is also often 0 when only the *viewport* flipped.
 * Rotating only when pixel aspect disagrees with the view prevents a
 * double-rotate that keeps the feed vertical after going landscape.
 */
export function resolveCameraAngle(
  camW: number,
  camH: number,
  viewW: number,
  viewH: number,
  apiAngle: ScreenAngle = 0,
): ScreenAngle {
  if (camW < 2 || camH < 2 || viewW < 2 || viewH < 2) {
    return viewW > viewH ? 90 : 0;
  }
  const camLand = camW >= camH;
  const viewLand = viewW >= viewH;
  if (camLand === viewLand) {
    return apiAngle === 180 ? 180 : 0;
  }
  if (apiAngle === 270) return 270;
  return 90;
}

/**
 * True when the phone is tilted horizontal OR the viewport is wider than tall.
 */
export function isLandscapeViewport(): boolean {
  if (typeof window === "undefined") return false;

  try {
    if (window.matchMedia("(orientation: landscape)").matches) return true;
  } catch {
    /* ignore */
  }

  const { w, h } = viewSize();
  if (w > h) return true;

  const angle = readApiAngle();
  return angle === 90 || angle === 270;
}

/**
 * Immersive chrome-hide: phone/tablet landscape only.
 * Desktop landscape used to hide every control, which made the app unusable.
 */
export function isImmersiveViewport(): boolean {
  if (typeof window === "undefined") return false;
  if (!isLandscapeViewport()) return false;
  try {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const narrow = window.matchMedia("(max-width: 920px)").matches;
    return coarse || narrow;
  } catch {
    return viewSize().w <= 920;
  }
}

export function isLandscapeAngle(angle: ScreenAngle): boolean {
  return angle === 90 || angle === 270;
}

function normalizeAngle(deg: number): ScreenAngle {
  const a = ((Math.round(deg) % 360) + 360) % 360;
  if (a >= 45 && a < 135) return 90;
  if (a >= 135 && a < 225) return 180;
  if (a >= 225 && a < 315) return 270;
  return 0;
}

/**
 * Subscribe to orientation + viewport changes.
 * Calls back with { angle, isLandscape, isImmersive } whenever either signal changes.
 */
export function subscribeOrientation(
  cb: (state: { angle: ScreenAngle; isLandscape: boolean; isImmersive: boolean }) => void,
): () => void {
  const fire = () => {
    cb({
      angle: getScreenAngle(),
      isLandscape: isLandscapeViewport(),
      isImmersive: isImmersiveViewport(),
    });
  };
  fire();

  window.addEventListener("orientationchange", fire);
  window.addEventListener("resize", fire);

  const so = window.screen?.orientation;
  if (so && typeof so.addEventListener === "function") {
    so.addEventListener("change", fire);
  }

  const vv = window.visualViewport;
  if (vv) {
    vv.addEventListener("resize", fire);
    vv.addEventListener("scroll", fire);
  }

  let mql: MediaQueryList | null = null;
  try {
    mql = window.matchMedia("(orientation: landscape)");
    if (typeof mql.addEventListener === "function") mql.addEventListener("change", fire);
    else if (typeof mql.addListener === "function") mql.addListener(fire);
  } catch {
    /* ignore */
  }

  return () => {
    window.removeEventListener("orientationchange", fire);
    window.removeEventListener("resize", fire);
    if (so && typeof so.removeEventListener === "function") {
      so.removeEventListener("change", fire);
    }
    if (vv) {
      vv.removeEventListener("resize", fire);
      vv.removeEventListener("scroll", fire);
    }
    if (mql) {
      if (typeof mql.removeEventListener === "function") mql.removeEventListener("change", fire);
      else if (typeof mql.removeListener === "function") mql.removeListener(fire);
    }
  };
}

/**
 * Map device beta/gamma into screen-space tilt (degrees).
 * +x = right, +y = toward the top of the *current* viewport.
 * Stays correct after the canvas flips landscape/portrait.
 */
export function mapTiltToScreen(
  beta: number,
  gamma: number,
  angle: ScreenAngle,
): { x: number; y: number } {
  switch (angle) {
    case 90:
      return { x: beta, y: -gamma };
    case 270:
      return { x: -beta, y: gamma };
    case 180:
      return { x: -gamma, y: -beta };
    default:
      return { x: gamma, y: beta };
  }
}

/** Convert screen tilt (deg from rest) into sim gravity. Very sensitive by default. */
export function tiltToGravity(
  dx: number,
  dy: number,
  axis: "on" | "horizontal" | "vertical",
  sensitivity: number,
): { gx: number; gy: number } {
  let x = dx;
  let y = dy;
  if (axis === "horizontal") y = 0;
  if (axis === "vertical") x = 0;
  const sens = Math.max(0, Math.min(1.5, sensitivity));
  const span = Math.max(4.2, 22 - sens * 14);
  let nx = Math.max(-1, Math.min(1, x / span));
  let ny = Math.max(-1, Math.min(1, y / span));
  const dead = 0.018;
  if (Math.abs(nx) < dead) nx = 0;
  if (Math.abs(ny) < dead) ny = 0;
  const gain = 0.012 + sens * 0.028;
  return { gx: nx * gain, gy: ny * gain };
}
