import { useCallback, useEffect, useRef, useState } from "react";
import {
  makeClip,
  pickRecordMime,
  prependClip,
  recFileName,
  recordBitrate,
  recordFps,
  recordLimitMs,
  recordProfileFor,
  clearClips,
  savePendingClip,
  type PendingClip,
  type RecordProfile,
} from "@/lib/ripple/record";
import {
  noticeForRecStart,
  noticeForTake,
  readRecAutosave,
  writeRecAutosave,
  type RecNotice,
} from "@/lib/ripple/rec-save";
import { REC_HD_EVENT, recHdEnabled, setRecBusy } from "@/lib/ripple/rec-hd";

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
  const [notice, setNotice] = useState<RecNotice | null>(null);
  const [clips, setClips] = useState<PendingClip[]>([]);
  const clipsRef = useRef<PendingClip[]>([]);
  clipsRef.current = clips;
  const noticeRef = useRef<RecNotice | null>(null);
  noticeRef.current = notice;
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
      setRecBusy(false);
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
    const profile = optsRef.current?.profile?.() ?? recordProfileFor(recHdEnabled());
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(REC_HD_EVENT));
    }
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
      setRecBusy(false);
      setError("Recorder failed");
      setState("idle");
      setStartedAt(null);
    };
    rec.onstop = () => {
      setRecBusy(false);
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
          const clip = makeClip(blob, name);
          setClips((prev) => prependClip(prev, clip));
          const mode = noticeForTake(readRecAutosave());
          if (mode === "saved") {
            savePendingClip(clip);
            setNotice({ clip, mode: "saved" });
          } else if (mode === "ask") {
            setNotice({ clip, mode: "ask" });
          } else {
            setNotice((n) => (n?.mode === "ask" ? { clip, mode: "ask" } : null));
          }
          await optsRef.current?.onBlob?.(blob, name, profile);
        } finally {
          finish();
        }
      })();
    };
    recRef.current = rec;
    setRecBusy(true);
    rec.start(profile === "hd" ? 1000 : 400);
    setActiveProfile(profile);
    setLimitMs(limit);
    setRemainingMs(limit);
    setStartedAt(Date.now());
    setState("recording");
    if (noticeForRecStart(readRecAutosave()) === "ask") {
      setNotice((n) => (n?.mode === "ask" ? n : { clip: n?.clip ?? null, mode: "ask" }));
    }
    limitTimer.current = window.setTimeout(() => rec.stop(), limit);
    return true;
  }, [getCanvas]);

  const toggle = useCallback(() => {
    if (state === "recording" || state === "saving") stop();
    else start();
  }, [state, start, stop]);

  const playClip = useCallback((clip: PendingClip) => {
    setNotice({ clip, mode: "play" });
  }, []);

  const acceptAutosave = useCallback(() => {
    writeRecAutosave("on");
    const clip = noticeRef.current?.clip;
    if (clip) savePendingClip(clip);
    setNotice(clip ? { clip, mode: "saved" } : null);
  }, []);

  const declineAutosave = useCallback(() => {
    writeRecAutosave("off");
    setNotice(null);
  }, []);

  const clearNotice = useCallback(() => setNotice(null), []);

  useEffect(
    () => () => {
      window.clearTimeout(limitTimer.current);
      setRecBusy(false);
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
      clearClips(clipsRef.current);
    },
    [],
  );

  return {
    state,
    startedAt,
    limitMs,
    remainingMs,
    notice,
    clips,
    error,
    profile: activeProfile,
    start,
    stop,
    toggle,
    playClip,
    acceptAutosave,
    declineAutosave,
    clearNotice,
  };
}
