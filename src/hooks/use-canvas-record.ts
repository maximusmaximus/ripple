import { useCallback, useEffect, useRef, useState } from "react";
import {
  offerDownload,
  pickRecordMime,
  recFileName,
  recordBitrate,
  recordFps,
  recordLimitMs,
  recordProfileFor,
  type PendingClip,
  type RecordProfile,
} from "@/lib/ripple/record";

export type RecordState = "idle" | "recording" | "saving";

export function useCanvasRecord(
  getCanvas: () => HTMLCanvasElement | null,
  opts?: {
    onBlob?: (blob: Blob, name: string, profile: RecordProfile) => void | Promise<void>;
    autoDownload?: boolean;
    profile?: () => RecordProfile;
  },
) {
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const limitTimer = useRef(0);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const [state, setState] = useState<RecordState>("idle");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [limitMs, setLimitMs] = useState(30_000);
  const [remainingMs, setRemainingMs] = useState(0);
  const [pendingClip, setPendingClip] = useState<PendingClip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeProfile, setActiveProfile] = useState<RecordProfile>("share");

  useEffect(() => {
    if (state !== "recording" || !startedAt) return;
    const tick = () => setRemainingMs(Math.max(0, limitMs - (Date.now() - startedAt)));
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [state, startedAt, limitMs]);

  const stop = useCallback(() => {
    window.clearTimeout(limitTimer.current);
    const rec = recRef.current;
    if (!rec || rec.state === "inactive") {
      setState("idle");
      setStartedAt(null);
      return;
    }
    rec.stop();
  }, []);

  const start = useCallback(() => {
    setError(null);
    if (recRef.current && recRef.current.state !== "inactive") return false;
    const canvas = getCanvas();
    if (!canvas || typeof canvas.captureStream !== "function") {
      setError("This browser can’t capture the canvas");
      return false;
    }
    const mime = pickRecordMime();
    if (!mime) {
      setError("Recording isn’t supported here");
      return false;
    }
    const profile = optsRef.current?.profile?.() ?? recordProfileFor(false);
    const fps = recordFps(profile);
    const limit = recordLimitMs(profile);
    const bits = recordBitrate(profile, canvas);
    let stream: MediaStream;
    try {
      stream = canvas.captureStream(fps);
    } catch {
      setError("Couldn’t start the capture");
      return false;
    }
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bits });
    chunks.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.current.push(e.data);
    };
    rec.onerror = () => {
      setError("Recorder failed");
      setState("idle");
      setStartedAt(null);
    };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks.current, { type: mime });
      chunks.current = [];
      recRef.current = null;
      setStartedAt(null);
      if (!blob.size) {
        setState("idle");
        return;
      }
      setState("saving");
      const name = recFileName(mime, profile);
      const finish = () => setState("idle");
      void (async () => {
        try {
          if (optsRef.current?.autoDownload !== false) {
            setPendingClip(offerDownload(blob, name));
          }
          await optsRef.current?.onBlob?.(blob, name, profile);
        } finally {
          finish();
        }
      })();
    };
    recRef.current = rec;
    rec.start(profile === "lanHd" ? 1000 : 400);
    setActiveProfile(profile);
    setLimitMs(limit);
    setRemainingMs(limit);
    setStartedAt(Date.now());
    setState("recording");
    limitTimer.current = window.setTimeout(() => rec.stop(), limit);
    return true;
  }, [getCanvas]);

  const toggle = useCallback(() => {
    if (state === "recording" || state === "saving") stop();
    else start();
  }, [state, start, stop]);

  useEffect(
    () => () => {
      window.clearTimeout(limitTimer.current);
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
    },
    [],
  );

  return {
    state,
    startedAt,
    limitMs,
    remainingMs,
    pendingClip,
    error,
    profile: activeProfile,
    start,
    stop,
    toggle,
    clearPending: () => setPendingClip(null),
  };
}