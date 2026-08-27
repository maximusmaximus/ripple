import { useLayoutEffect, useRef, useState } from "react";

function readIsDesktopHost() {
  if (typeof window === "undefined") return false;
  const wide = window.matchMedia("(min-width: 768px)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;
  const hover = window.matchMedia("(hover: hover)").matches;
  return wide && fine && hover;
}

/** Wide, mouse-first viewport: this studio hosts the phone pad. Starts false to match SSR. */
export function useDesktopHost() {
  return useViewport().isDesktop;
}

export function useViewport() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [ready, setReady] = useState(false);
  const lock = useRef<"desktop" | "mobile" | null>(null);

  useLayoutEffect(() => {
    const wideMq = window.matchMedia("(min-width: 768px)");
    const fineMq = window.matchMedia("(pointer: fine)");
    const hoverMq = window.matchMedia("(hover: hover)");

    const apply = () => {
      const next = readIsDesktopHost() ? "desktop" : "mobile";
      if (lock.current === "mobile") {
        setIsDesktop(false);
        setReady(true);
        return;
      }
      if (lock.current === null) lock.current = next;
      else if (next === "mobile") lock.current = "mobile";
      setIsDesktop(lock.current === "desktop");
      setReady(true);
    };

    apply();
    wideMq.addEventListener("change", apply);
    fineMq.addEventListener("change", apply);
    hoverMq.addEventListener("change", apply);
    return () => {
      wideMq.removeEventListener("change", apply);
      fineMq.removeEventListener("change", apply);
      hoverMq.removeEventListener("change", apply);
    };
  }, []);

  return { isDesktop, ready };
}
