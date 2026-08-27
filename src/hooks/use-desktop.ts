import { useLayoutEffect, useState } from "react";

/** Wide viewport: this studio hosts the phone pad. Starts false to match SSR. */
export function useDesktopHost() {
  return useViewport().isDesktop;
}

export function useViewport() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    const apply = () => {
      setIsDesktop(window.matchMedia("(min-width: 768px)").matches);
      setReady(true);
    };
    apply();
    const mq = window.matchMedia("(min-width: 768px)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return { isDesktop, ready };
}
