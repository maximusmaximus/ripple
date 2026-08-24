import { useCallback, useState } from "react";
import {
  Camera,
  CameraOff,
  SwitchCamera,
  Mic,
  Smartphone,
  MoveHorizontal,
  MoveVertical,
} from "lucide-react";
import type { GyroMode, SensorsState } from "@/lib/ripple/media";
import { mediaErrorMessage, nextGyroMode } from "@/lib/ripple/media";

type Props = {
  sensors: SensorsState;
  onChange: (s: SensorsState) => void;
};

async function openCamera(facing: "user" | "environment"): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facing } },
      audio: false,
    });
  } catch {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facing },
      audio: false,
    });
  }
}

export function SensorsBar({ sensors, onChange }: Props) {
  const [busy, setBusy] = useState(false);

  /** Cycle: off → rear → front → off. One top-left button. */
  const cycleCamera = useCallback(async () => {
    if (busy) return;
    setBusy(true);

    const stopTracks = () => {
      sensors.cameraStream?.getTracks().forEach((t) => t.stop());
    };

    try {
      if (!sensors.cameraOn) {
        try {
          const stream = await openCamera("environment");
          onChange({
            ...sensors,
            cameraOn: true,
            cameraStream: stream,
            facingMode: "environment",
            error: null,
          });
        } catch {
          const stream = await openCamera("user");
          onChange({
            ...sensors,
            cameraOn: true,
            cameraStream: stream,
            facingMode: "user",
            error: null,
          });
        }
        return;
      }

      if (sensors.facingMode === "environment") {
        stopTracks();
        try {
          const stream = await openCamera("user");
          onChange({
            ...sensors,
            cameraOn: true,
            cameraStream: stream,
            facingMode: "user",
            error: null,
          });
        } catch (err) {
          onChange({
            ...sensors,
            cameraOn: false,
            cameraStream: null,
            facingMode: "user",
            error: mediaErrorMessage(err),
          });
        }
        return;
      }

      stopTracks();
      onChange({
        ...sensors,
        cameraOn: false,
        cameraStream: null,
        error: null,
      });
    } catch (err) {
      onChange({
        ...sensors,
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

  const cycleGyro = useCallback(async () => {
    if (busy) return;
    const current: GyroMode = sensors.gyroMode ?? (sensors.gyroOn ? "on" : "off");
    const next = nextGyroMode(current);

    if (next === "off") {
      onChange({ ...sensors, gyroOn: false, gyroMode: "off", error: null });
      return;
    }

    if (current !== "off") {
      onChange({ ...sensors, gyroOn: true, gyroMode: next, error: null });
      return;
    }

    setBusy(true);
    try {
      const request =
        (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
          .requestPermission ||
        (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> })
          .requestPermission;
      if (typeof request === "function") {
        const state = await request();
        if (state !== "granted") {
          onChange({
            ...sensors,
            gyroOn: false,
            gyroMode: "off",
            error: "Gyroscope permission denied",
          });
          return;
        }
      }
      onChange({ ...sensors, gyroOn: true, gyroMode: next, error: null });
    } catch (err) {
      onChange({
        ...sensors,
        gyroOn: true,
        gyroMode: next,
        error: mediaErrorMessage(err) || null,
      });
    } finally {
      setBusy(false);
    }
  }, [busy, sensors, onChange]);

  const gyroMode: GyroMode = sensors.gyroMode ?? (sensors.gyroOn ? "on" : "off");
  const gyroTitle =
    gyroMode === "off"
      ? "Gyro off"
      : gyroMode === "horizontal"
        ? "Gyro horizontal only"
        : gyroMode === "vertical"
          ? "Gyro vertical only"
          : "Gyro on";
  const GyroIcon =
    gyroMode === "horizontal" ? MoveHorizontal : gyroMode === "vertical" ? MoveVertical : Smartphone;

  const camState: "off" | "rear" | "front" = !sensors.cameraOn
    ? "off"
    : sensors.facingMode === "environment"
      ? "rear"
      : "front";

  const camLabel =
    camState === "off"
      ? "Camera off — tap for rear"
      : camState === "rear"
        ? "Rear camera — tap for front"
        : "Front camera — tap to turn off";

  const CamIcon = camState === "off" ? CameraOff : camState === "rear" ? Camera : SwitchCamera;

  const btn =
    "pointer-events-auto relative flex h-11 w-11 items-center justify-center rounded-full border border-line bg-ink/50 text-fg/80 backdrop-blur-md transition hover:bg-ink/70 hover:text-fg active:scale-95";

  return (
    <div
      data-ui-chrome
      className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex gap-2">
        <button
          type="button"
          className={btn}
          style={{ opacity: camState === "off" ? 0.5 : 1 }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void cycleCamera();
          }}
          disabled={busy}
          aria-label={camLabel}
          title={camLabel}
        >
          <CamIcon className="size-4" strokeWidth={1.75} />
          {camState !== "off" && (
            <span className="absolute -bottom-0.5 rounded-full bg-ink/90 px-1 text-[8px] font-semibold tracking-wide text-fg">
              {camState === "rear" ? "REAR" : "FRONT"}
            </span>
          )}
          {camState === "off" && (
            <span className="absolute -bottom-0.5 rounded-full bg-ink/70 px-1 text-[8px] font-semibold tracking-wide text-fg/70">
              OFF
            </span>
          )}
        </button>
        <button
          type="button"
          className={btn}
          style={{ opacity: sensors.micOn ? 1 : 0.55 }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void toggleMic();
          }}
          disabled={busy}
          aria-label="Toggle microphone"
          title="Microphone"
        >
          <Mic className="size-4" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className={btn}
          style={{ opacity: gyroMode === "off" ? 0.55 : 1 }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void cycleGyro();
          }}
          disabled={busy}
          aria-label={gyroTitle}
          title={`${gyroTitle} — tap to cycle`}
        >
          <GyroIcon className="size-4" strokeWidth={1.75} />
          {gyroMode !== "off" && (
            <span className="absolute -bottom-0.5 rounded-full bg-ink/80 px-1 text-[8px] font-semibold tracking-wide text-fg/90">
              {gyroMode === "on" ? "ON" : gyroMode === "horizontal" ? "H" : "V"}
            </span>
          )}
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
