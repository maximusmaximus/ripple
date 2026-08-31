import { useEffect, useRef } from "react";
import type { SensorsState } from "@/lib/ripple/media";
import { mediaErrorMessage, openCamera, stopMediaStream } from "@/lib/ripple/media";
import { useRippleStore } from "@/store/ripple";

/** Presets that mix the camera ask for permission from the same tap that loaded them. */
export function useCameraWanted(sensors: SensorsState, onChange: (s: SensorsState) => void) {
  const wanted = useRippleStore((s) => s.cameraWanted);
  const setWanted = useRippleStore((s) => s.setCameraWanted);
  const sensorsRef = useRef(sensors);
  sensorsRef.current = sensors;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!wanted) return;
    const current = sensorsRef.current;
    if (current.cameraOn && current.cameraStream) {
      setWanted(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const opened = await openCamera("user");
        if (cancelled) {
          await stopMediaStream(opened.stream);
          return;
        }
        onChangeRef.current({
          ...sensorsRef.current,
          cameraOn: true,
          cameraStream: opened.stream,
          facingMode: opened.facing,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        onChangeRef.current({
          ...sensorsRef.current,
          cameraOn: false,
          cameraStream: null,
          error: mediaErrorMessage(err),
        });
      } finally {
        if (!cancelled) setWanted(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wanted, setWanted]);
}
