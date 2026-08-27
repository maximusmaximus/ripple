import { useEffect, useRef } from "react";

function requestNavHide(el: HTMLElement) {
  const req =
    el.requestFullscreen?.bind(el) ??
    (el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen?.bind(el);
  if (!req) return Promise.resolve();
  try {
    return Promise.resolve(req({ navigationUI: "hide" } as FullscreenOptions)).catch(() => {});
  } catch {
    try {
      return Promise.resolve(req()).catch(() => {});
    } catch {
      return Promise.resolve();
    }
  }
}

/** Nudge Safari/Chrome to collapse the bottom toolbar when fullscreen is blocked. */
function collapseBrowserChrome() {
  if (typeof window === "undefined") return;
  if (document.fullscreenElement) return;
  const root = document.documentElement;
  const prev = root.style.minHeight;
  root.style.minHeight = `${Math.max(window.innerHeight, window.screen.height)}px`;
  try {
    window.scrollTo(0, 1);
  } catch {
    /* ignore */
  }
  window.requestAnimationFrame(() => {
    try {
      window.scrollTo(0, 0);
    } catch {
      /* ignore */
    }
    root.style.minHeight = prev;
  });
}

/**
 * Hide the browser footer (Safari/Chrome toolbars) while painting or in landscape.
 * Fullscreen is the real hide; the scroll nudge is the iOS fallback.
 */
export function useAppFullscreen({
  enabled,
  landscape,
  active,
}: {
  enabled: boolean;
  landscape: boolean;
  active: boolean;
}) {
  const wanted = enabled && (landscape || active);
  const wantedRef = useRef(wanted);
  wantedRef.current = wanted;

  useEffect(() => {
    if (!wanted) return;
    const el = document.documentElement;
    void requestNavHide(el);
    collapseBrowserChrome();
  }, [wanted]);

  useEffect(() => {
    if (!enabled) return;
    const onGesture = () => {
      if (!wantedRef.current) return;
      if (document.fullscreenElement) return;
      void requestNavHide(document.documentElement);
      collapseBrowserChrome();
    };
    window.addEventListener("pointerdown", onGesture, { passive: true, capture: true });
    window.addEventListener("touchend", onGesture, { passive: true, capture: true });
    return () => {
      window.removeEventListener("pointerdown", onGesture, true);
      window.removeEventListener("touchend", onGesture, true);
    };
  }, [enabled]);
}
