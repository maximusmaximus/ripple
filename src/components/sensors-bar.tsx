import { useCallback, useEffect, useState } from "react";
import {
  Camera,
  CameraOff,
  SwitchCamera,
  Mic,
  Smartphone,
  MoveHorizontal,
  MoveVertical,
  Circle,
  Square,
  Lightbulb,
} from "lucide-react";
import type { GyroMode, SensorsState } from "@/lib/ripple/media";
import { mediaErrorMessage, nextGyroMode } from "@/lib/ripple/media";
import { formatCountdown, savePendingClip, type PendingClip } from "@/lib/ripple/record";
import { TipMark } from "./tip-mark";

type Props = {
  sensors: SensorsState;
  onChange: (s: SensorsState) => void;
  recording?: boolean;
  onToggleRecord?: () => void;
  recordStartedAt?: number | null;
  recordLimitMs?: number;
  recordRemainingMs?: number;
  recordSaving?: boolean;
  pendingClip?: PendingClip | null;
  onSaveClip?: () => void;
  recNote?: string | null;
  recordError?: string | null;
  linkState?: "off" | "waiting" | "live";
  onToggleLink?: () => void;
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

export function SensorsBar({
  sensors,
  onChange,
  recording = false,
  onToggleRecord,
  recordStartedAt,
  recordLimitMs = 8_000,
  recordRemainingMs,
  recordSaving = false,
  pendingClip,
  onSaveClip,
  recNote,
  recordError,
  linkState,
  onToggleLink,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!recording && !recordSaving) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [recording, recordSaving]);
  const remaining =
    recordRemainingMs != null
      ? recordRemainingMs
      : recording && recordStartedAt
        ? Math.max(0, recordLimitMs - (now - recordStartedAt))
        : 0;
  const tight = recording && remaining <= 3000;

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
        <span className="relative">
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
          <TipMark id="camera" className="pointer-events-auto absolute -right-0.5 -top-0.5 z-20" />
        </span>
        <span className="relative">
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
          <TipMark id="mic" className="pointer-events-auto absolute -right-0.5 -top-0.5 z-20" />
        </span>
        <span className="relative">
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
          <TipMark id="gyro" className="pointer-events-auto absolute -right-0.5 -top-0.5 z-20" />
        </span>
      </div>
      {sensors.error && (
        <div className="pointer-events-auto max-w-[40%] rounded-lg bg-ink/70 px-3 py-1.5 text-xs text-amber-200 backdrop-blur">
          {sensors.error}
        </div>
      )}
      <div className="flex items-center gap-2">
      {onToggleLink && (
        <span className="relative max-md:hidden">
        <button
          type="button"
          className={
            "pointer-events-auto relative flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition active:scale-95 " +
            (linkState === "live"
              ? "border-emerald-400/80 bg-emerald-500/25 text-emerald-100 shadow-[0_0_16px_rgba(52,211,153,0.45)]"
              : linkState === "waiting"
                ? "border-amber-400/70 bg-amber-500/15 text-amber-100"
                : "border-line bg-ink/50 text-fg/55 hover:bg-ink/70 hover:text-fg")
          }
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleLink();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleLink();
          }}
          aria-label={
            linkState === "live"
              ? "Phone connected — show link"
              : linkState === "waiting"
                ? "Waiting for a phone"
                : "Connect a secondary device"
          }
          title={
            linkState === "live"
              ? "Phone connected"
              : linkState === "waiting"
                ? "Waiting for a phone"
                : "No secondary device"
          }
        >
          <Lightbulb
            className={"size-4 " + (linkState === "live" ? "fill-current" : "")}
            strokeWidth={1.75}
          />
          {linkState === "waiting" && (
            <span className="absolute -bottom-0.5 rounded-full bg-ink/80 px-1 text-[8px] font-semibold tracking-wide text-amber-200">
              …
            </span>
          )}
          {linkState === "live" && (
            <span className="absolute -bottom-0.5 rounded-full bg-ink/80 px-1 text-[8px] font-semibold tracking-wide text-emerald-200">
              ON
            </span>
          )}
        </button>
          <TipMark id="pair" className="pointer-events-auto absolute -right-0.5 -top-0.5 z-20" />
        </span>
      )}
      {onToggleRecord && (
        <span className="relative">
        <button
          type="button"
          className={
            "pointer-events-auto relative flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border backdrop-blur-md transition active:scale-95 " +
            (recording
              ? "rec-live border-red-400 bg-red-600 px-3 text-white shadow-[0_0_18px_rgba(220,38,38,0.55)] " +
                (tight ? "rec-tight" : "")
              : recordSaving
                ? "border-amber-300/80 bg-amber-700/80 px-3 text-white"
                : "border-line bg-ink/50 px-2.5 text-fg/85 hover:bg-ink/70 hover:text-fg")
          }
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleRecord();
          }}
          disabled={recordSaving}
          aria-pressed={recording}
          aria-label={
            recording
              ? `Stop recording, ${formatCountdown(remaining)} left`
              : recordSaving
                ? "Saving clip"
                : "Start recording"
          }
          title={
            recording
              ? `${formatCountdown(remaining)} left · tap to stop. Auto-saves to this device and the linked one.`
              : "Record the canvas. Linked devices both get the clip."
          }
        >
          {recording ? (
            <Square className="size-3.5 fill-current" strokeWidth={2} />
          ) : (
            <Circle className="size-4 text-red-500" strokeWidth={2.5} fill="currentColor" />
          )}
          <span
            className={
              "font-mono text-[10px] font-semibold tracking-wide tabular-nums " +
              (recording || recordSaving ? "text-white" : "text-fg/80")
            }
          >
            {recording ? formatCountdown(remaining) : recordSaving ? "SAVE" : "REC"}
          </span>
        </button>
          <TipMark id="rec" className="pointer-events-auto absolute -right-0.5 -top-0.5 z-20" />
        </span>
      )}
      {pendingClip && (
        <button
          type="button"
          className="pointer-events-auto flex h-11 items-center rounded-full border border-emerald-300/70 bg-emerald-700/85 px-3 text-[11px] font-semibold text-white"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            savePendingClip(pendingClip);
            onSaveClip?.();
          }}
        >
          Save clip
        </button>
      )}
      {recordError && (
        <span className="pointer-events-none max-w-[9rem] truncate rounded-full bg-rose-600/80 px-2 py-1 text-[10px] text-white">
          {recordError}
        </span>
      )}
      {recNote && !pendingClip && (
        <span className="pointer-events-none max-w-[10rem] truncate rounded-full bg-ink/70 px-2 py-1 text-[10px] text-fg/85">
          {recNote}
        </span>
      )}
      </div>
    </div>
  );
}
