/** Screen orientation angle in degrees (clockwise from portrait-primary). */
export type ScreenAngle = 0 | 90 | 180 | 270

/**
 * Device rotation angle from the Orientation API / legacy window.orientation.
 * On desktop this is usually always 0 even when the window is wide.
 */
export function getScreenAngle(): ScreenAngle {
  if (typeof window === 'undefined') return 0

  const so = window.screen?.orientation
  if (so && typeof so.angle === 'number') {
    return normalizeAngle(so.angle)
  }

  // Legacy Window.orientation (iOS Safari, older Android)
  const legacy = (window as Window & { orientation?: number }).orientation
  if (typeof legacy === 'number') {
    return normalizeAngle(legacy)
  }

  return 0
}

/**
 * True when the phone is tilted horizontal OR the viewport is wider than tall.
 * Uses matchMedia + aspect as primary signals so desktop/tablets also hide chrome.
 */
export function isLandscapeViewport(): boolean {
  if (typeof window === 'undefined') return false

  try {
    if (window.matchMedia('(orientation: landscape)').matches) return true
  } catch {
    /* ignore */
  }

  // Aspect fallback (some WebViews don't fire orientation media queries reliably)
  if (window.innerWidth > window.innerHeight) return true

  // Physical device tilted even if the layout hasn't caught up yet
  const angle = getScreenAngle()
  return angle === 90 || angle === 270
}

export function isLandscapeAngle(angle: ScreenAngle): boolean {
  return angle === 90 || angle === 270
}

function normalizeAngle(deg: number): ScreenAngle {
  const a = ((Math.round(deg) % 360) + 360) % 360
  if (a >= 45 && a < 135) return 90
  if (a >= 135 && a < 225) return 180
  if (a >= 225 && a < 315) return 270
  return 0
}

/**
 * Subscribe to orientation + viewport changes.
 * Calls back with { angle, isLandscape } whenever either signal changes.
 */
export function subscribeOrientation(
  cb: (state: { angle: ScreenAngle; isLandscape: boolean }) => void,
): () => void {
  const fire = () => {
    cb({
      angle: getScreenAngle(),
      isLandscape: isLandscapeViewport(),
    })
  }
  fire()

  window.addEventListener('orientationchange', fire)
  window.addEventListener('resize', fire)

  const so = window.screen?.orientation
  if (so && typeof so.addEventListener === 'function') {
    so.addEventListener('change', fire)
  }

  let mql: MediaQueryList | null = null
  try {
    mql = window.matchMedia('(orientation: landscape)')
    if (typeof mql.addEventListener === 'function') mql.addEventListener('change', fire)
    else if (typeof mql.addListener === 'function') mql.addListener(fire)
  } catch {
    /* ignore */
  }

  return () => {
    window.removeEventListener('orientationchange', fire)
    window.removeEventListener('resize', fire)
    if (so && typeof so.removeEventListener === 'function') {
      so.removeEventListener('change', fire)
    }
    if (mql) {
      if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', fire)
      else if (typeof mql.removeListener === 'function') mql.removeListener(fire)
    }
  }
}
