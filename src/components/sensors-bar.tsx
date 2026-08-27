import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  Eye,
} from "lucide-react";
import type { GyroMode, SensorsState } from "@/lib/ripple/media";
import {
  cameraDeviceId,
  countVideoCameras,
  mediaErrorMessage,
  nextGyroMode,
  openCamera,
  stopMediaStream,
} from "@/lib/ripple/media";
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
  viewers?: number;
  showViewers?: boolean;
};

export function SensorsBar({
  sensors,
  onChange,
  recording = false,
  onToggleRecord,
  recordStartedAt,
  recordLimitMs = 30_000,
  recordRemainingMs,
  recordSaving = false,
  pendingClip,
  onSaveClip,
  recNote,
  recordError,
  linkState,
  onToggleLink,
  viewers = 0,
  showViewers = false,
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

  /** Cycle: off → front (faces you) → rear → off. */
  const cycleCamera = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const prev = sensors.cameraStream;
    const prevId = cameraDeviceId(prev);

    const close = async () => {
      await stopMediaStream(prev);
      onChange({
        ...sensors,
        cameraOn: false,
        cameraStream: null,
        error: null,
      });
    };

    try {
      if (!sensors.cameraOn) {
        const opened = await openCamera("user");
        onChange({
          ...sensors,
          cameraOn: true,
          cameraStream: opened.stream,
          facingMode: opened.facing,
          error: null,
        });
        return;
      }

      if (sensors.facingMode === "user") {
        const cams = await countVideoCameras();
        if (cams < 2) {
          await close();
          return;
        }
        await stopMediaStream(prev);
        try {
          const opened = await openCamera("environment", { excludeDeviceId: prevId });
          if (prevId && cameraDeviceId(opened.stream) === prevId) {
            await stopMediaStream(opened.stream);
            onChange({
              ...sensors,
              cameraOn: false,
              cameraStream: null,
              facingMode: "user",
              error: null,
            });
            return;
          }
          onChange({
            ...sensors,
            cameraOn: true,
            cameraStream: opened.stream,
            facingMode: opened.facing === "user" && cams > 1 ? "environment" : opened.facing,
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

      await close();
    } catch (err) {
      await stopMediaStream(prev);
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
      ? "Camera off — tap for front"
      : camState === "front"
        ? "Front camera — tap for rear"
        : "Rear camera — tap to turn off";

  const CamIcon = camState === "off" ? CameraOff : camState === "rear" ? Camera : SwitchCamera;

  const btn =
    "pointer-events-auto relative flex h-11 w-11 items-center justify-center rounded-full border border-line bg-ink/50 text-fg/80 backdrop-blur-md transition hover:bg-ink/70 hover:text-fg active:scale-95";

  return (
    <div
      data-ui-chrome
      className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]"
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
      <div className="flex items-center gap-1.5">
      {onToggleLink && (
        <span className="relative flex items-center gap-1.5">
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
              ? "Linked — show pairing"
              : linkState === "waiting"
                ? "Waiting for a link"
                : "Pair with a larger screen"
          }
          title={
            linkState === "live"
              ? "Linked"
              : linkState === "waiting"
                ? "Waiting for a link"
                : "Pair screens"
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
      {(showViewers || viewers > 0) && (
        <span className="relative">
        <span
          data-live-viewers={viewers}
          className="pointer-events-none inline-flex h-11 items-center gap-1.5 rounded-full border border-emerald-400/40 bg-ink/70 px-2.5 text-[11px] font-semibold tabular-nums text-emerald-100 backdrop-blur-md"
          title={viewers === 1 ? "1 watching" : `${viewers} watching`}
          aria-label={viewers === 1 ? "1 watching" : `${viewers} watching`}
        >
          <Eye className="size-3.5" strokeWidth={1.75} />
          {viewers}
        </span>
          <TipMark id="live" className="pointer-events-auto absolute -right-0.5 -top-0.5 z-20" />
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
        <RecSavePopup
          clip={pendingClip}
          note={recNote}
          onSave={() => {
            savePendingClip(pendingClip);
            onSaveClip?.();
          }}
          onDismiss={() => onSaveClip?.()}
        />
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

function RecSavePopup({
  clip,
  note,
  onSave,
  onDismiss,
}: {
  clip: PendingClip;
  note?: string | null;
  onSave: () => void;
  onDismiss: () => void;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      data-ui-chrome
      className="fixed inset-0 z-[95] flex items-end justify-center p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:items-center"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
        aria-hidden
        onPointerDown={onDismiss}
      />
      <div
        role="dialog"
        aria-labelledby="rec-save-title"
        className="relative z-10 w-full max-w-sm rounded-3xl border border-line bg-ink p-5 shadow-2xl"
      >
        <h2 id="rec-save-title" className="text-lg font-semibold text-fg">
          Recording ready
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {note || "Your clip is ready. On a phone, tap Save — the browser will not download it on its own."}
        </p>
        <p className="mt-3 break-all rounded-xl bg-fg/8 px-3 py-2 font-mono text-[12px] leading-snug text-fg/85">
          {clip.name}
        </p>
        <button
          type="button"
          className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-fg px-4 text-[15px] font-semibold text-ink"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSave();
          }}
        >
          Save to this device
        </button>
        <button
          type="button"
          className="mt-2 flex min-h-11 w-full items-center justify-center rounded-full px-4 text-sm text-muted hover:text-fg"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss();
          }}
        >
          Not now
        </button>
      </div>
    </div>,
    document.body,
  );
}
