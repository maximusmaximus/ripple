import { useEffect, useState } from "react";
import {
  getScreenAngle,
  isImmersiveViewport,
  isLandscapeViewport,
  subscribeOrientation,
  type ScreenAngle,
} from "@/lib/ripple/orientation";

export function useOrientation() {
  const [angle, setAngle] = useState<ScreenAngle>(() =>
    typeof window !== "undefined" ? getScreenAngle() : 0,
  );
  const [isLandscape, setIsLandscape] = useState(() =>
    typeof window !== "undefined" ? isLandscapeViewport() : false,
  );
  const [isImmersive, setIsImmersive] = useState(() =>
    typeof window !== "undefined" ? isImmersiveViewport() : false,
  );

  useEffect(
    () =>
      subscribeOrientation(({ angle: a, isLandscape: land, isImmersive: imm }) => {
        setAngle(a);
        setIsLandscape(land);
        setIsImmersive(imm);
      }),
    [],
  );

  return {
    angle,
    isLandscape,
    isImmersive,
    isPortrait: !isLandscape,
  };
}
