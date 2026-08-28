import { useCallback } from "react";

/** The circle wake splash is retired. Boot uses VOIDRIDE hold instead. */
export function useSurfaceSplash() {
  const markReady = useCallback(() => {}, []);
  return { markReady, fading: true, show: false as const, progress: 1 };
}

export function RippleSplash(_props: {
  fading?: boolean;
  progress?: number;
  colors?: string[];
}) {
  return null;
}
