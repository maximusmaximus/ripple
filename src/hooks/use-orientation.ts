import { useEffect, useState } from 'react'
import {
  getScreenAngle,
  isLandscapeViewport,
  subscribeOrientation,
  type ScreenAngle,
} from '../lib/ripple/orientation'

export function useOrientation() {
  const [angle, setAngle] = useState<ScreenAngle>(() =>
    typeof window !== 'undefined' ? getScreenAngle() : 0,
  )
  const [isLandscape, setIsLandscape] = useState(() =>
    typeof window !== 'undefined' ? isLandscapeViewport() : false,
  )

  useEffect(
    () =>
      subscribeOrientation(({ angle: a, isLandscape: land }) => {
        setAngle(a)
        setIsLandscape(land)
      }),
    [],
  )

  return {
    angle,
    isLandscape,
    isPortrait: !isLandscape,
  }
}
