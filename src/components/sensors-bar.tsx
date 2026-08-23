import { useCallback, useState } from "react";
import { Camera, FlipHorizontal2, Mic, Smartphone } from "lucide-react";
import type { SensorsState } from "@/lib/ripple/media";
import { mediaErrorMessage } from "@/lib/ripple/media";

type Props = {
  sensors: SensorsState;
  onChange: (s: SensorsState) => void;
};

export function SensorsBar({ sensors, onChange }: Props) {
  const [busy, setBusy] = useState(false);

  const toggleCamera = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (sensors.cameraOn && sensors.cameraStream) {
        sensors.cameraStream.getTracks().forEach((t) => t.stop());
        onChange({ ...sensors, cameraOn: false, cameraStream: null, error: null });
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: sensors.facingMode },
          audio: false,
        });
        onChange({
          ...sensors,
          cameraOn: true,
          cameraStream: stream,
          error: null,
        });
      }
    } catch (err) {
      onChange({ ...sensors, cameraOn: false, cameraStream: null, error: mediaErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }, [busy, sensors, onChange]);

  const flipCamera = useCallback(async () => {
    if (busy) return;
    const nextFacing = sensors.facingMode === "user" ? "environment" : "user";
    if (!sensors.cameraOn) {
      onChange({ ...sensors, facingMode: nextFacing });
      return;
    }
    setBusy(true);
    try {
      sensors.cameraStream?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing },
        audio: false,
      });
      onChange({
        ...sensors,
        facingMode: nextFacing,
        cameraOn: true,
        cameraStream: stream,
        error: null,
      });
    } catch (err) {
      onChange({
        ...sensors,
        facingMode: nextFacing,
        cameraOn: false,
        cameraStream: null,
        error: mediaErrorMessage(err),
      });
    } finally {
      setBusy(false);
    }
  }, [busy, sensors, onChange]);

  const toggleMic = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (sensors.micOn && sensors.micStream) {
        sensors.micStream.getTracks().forEach((t) => t.stop());
        onChange({ ...sensors, micOn: false, micStream: null, error: null });
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        onChange({ ...sensors, micOn: true, micStream: stream, error: null });
      }
    } catch (err) {
      onChange({ ...sensors, micOn: false, micStream: null, error: mediaErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }, [busy, sensors, onChange]);

  const toggleGyro = useCallback(async () => {
    if (busy) return;
    if (sensors.gyroOn) {
      onChange({ ...sensors, gyroOn: false, error: null });
      return;
    }

    setBusy(true);
    try {
      const DOE = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<"granted" | "denied" | "default">;
      };
      if (typeof DOE.requestPermission === "function") {
        const state = await DOE.requestPermission();
        if (state !== "granted") {
          onChange({
            ...sensors,
            gyroOn: false,
            error: "Gyroscope permission denied",
          });
          return;
        }
      }

      const hasMotion =
        typeof window !== "undefined" &&
        ("DeviceOrientationEvent" in window || "DeviceMotionEvent" in window);
      if (!hasMotion) {
        onChange({
          ...sensors,
          gyroOn: false,
          error: "No gyroscope on this device",
        });
        return;
      }

      onChange({ ...sensors, gyroOn: true, error: null });
    } catch (err) {
      onChange({
        ...sensors,
        gyroOn: false,
        error: mediaErrorMessage(err) || "Gyroscope unavailable",
      });
    } finally {
      setBusy(false);
    }
  }, [busy, sensors, onChange]);

  const btn =
    "pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-line bg-ink/50 text-fg/80 backdrop-blur-md transition hover:bg-ink/70 hover:text-fg";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex gap-2">
        <button
          type="button"
          className={btn}
          style={{ opacity: sensors.cameraOn ? 1 : 0.55 }}
          onClick={toggleCamera}
          aria-label="Toggle camera"
          title="Camera"
        >
          <Camera className="size-4" strokeWidth={1.75} />
        </button>
        {sensors.cameraOn && (
          <button
            type="button"
            className={btn}
            onClick={flipCamera}
            aria-label="Flip camera"
            title="Flip camera"
          >
            <FlipHorizontal2 className="size-4" strokeWidth={1.75} />
          </button>
        )}
        <button
          type="button"
          className={btn}
          style={{ opacity: sensors.micOn ? 1 : 0.55 }}
          onClick={toggleMic}
          aria-label="Toggle microphone"
          title="Microphone"
        >
          <Mic className="size-4" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className={btn}
          style={{ opacity: sensors.gyroOn ? 1 : 0.55 }}
          onClick={toggleGyro}
          aria-label="Toggle gyroscope"
          title="Gyroscope"
        >
          <Smartphone className="size-4" strokeWidth={1.75} />
        </button>
      </div>
      {sensors.error && (
        <div className="pointer-events-auto max-w-[60%] rounded-lg bg-ink/70 px-3 py-1.5 text-xs text-amber-200 backdrop-blur">
          {sensors.error}
        </div>
      )}
    </div>
  );
}
