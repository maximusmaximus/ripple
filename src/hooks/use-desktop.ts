import { useLayoutEffect, useRef, useState } from "react";
import { isTabletViewport, TABLET_MIN_HEIGHT, TABLET_MIN_WIDTH } from "@/lib/ripple/float-dock";

/** Mouse / trackpad with hover. Touch and pens are coarse — hide internal scroll rails. */
export function useFinePointer() {
  const [fine, setFine] = useState(false);
  useLayoutEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => {
      const on = mq.matches;
      setFine(on);
      document.documentElement.dataset.pointer = on ? "fine" : "coarse";
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return fine;
}

function readIsDesktopHost() {
  if (typeof window === "undefined") return false;
  const wide = window.matchMedia(`(min-width: ${TABLET_MIN_WIDTH}px)`).matches;
  const fine = window.matchMedia("(pointer: fine)").matches;
  const hover = window.matchMedia("(hover: hover)").matches;
  return wide && fine && hover;
}

function readIsTabletHost() {
  if (typeof window === "undefined") return false;
  const fine = window.matchMedia("(pointer: fine)").matches;
  const hover = window.matchMedia("(hover: hover)").matches;
  return isTabletViewport({
    width: window.innerWidth,
    height: window.innerHeight,
    finePointer: fine,
    hover,
  });
}

/** Wide, mouse-first viewport: this studio hosts the phone pad. Starts false to match SSR. */
export function useDesktopHost() {
  return useViewport().isDesktop;
}

export function useViewport() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [ready, setReady] = useState(false);
  const lock = useRef<"desktop" | "mobile" | null>(null);

  useLayoutEffect(() => {
    const wideMq = window.matchMedia(`(min-width: ${TABLET_MIN_WIDTH}px)`);
    const tallMq = window.matchMedia(`(min-height: ${TABLET_MIN_HEIGHT}px)`);
    const fineMq = window.matchMedia("(pointer: fine)");
    const hoverMq = window.matchMedia("(hover: hover)");

    const apply = () => {
      const next = readIsDesktopHost() ? "desktop" : "mobile";
      if (lock.current === "mobile") {
        setIsDesktop(false);
        setIsTablet(readIsTabletHost());
        setReady(true);
        return;
      }
      if (lock.current === null) lock.current = next;
      else if (next === "mobile") lock.current = "mobile";
      setIsDesktop(lock.current === "desktop");
      setIsTablet(lock.current !== "desktop" && readIsTabletHost());
      setReady(true);
    };

    apply();
    wideMq.addEventListener("change", apply);
    tallMq.addEventListener("change", apply);
    fineMq.addEventListener("change", apply);
    hoverMq.addEventListener("change", apply);
    window.addEventListener("resize", apply);
    return () => {
      wideMq.removeEventListener("change", apply);
      tallMq.removeEventListener("change", apply);
      fineMq.removeEventListener("change", apply);
      hoverMq.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);

  return { isDesktop, isTablet, ready };
}
