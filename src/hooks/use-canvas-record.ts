import { useCallback, useRef, useState } from "react";

export type RecordState = "idle" | "recording";

function pickMime(): string | undefined {
  const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  if (typeof MediaRecorder === "undefined") return undefined;
  return types.find((t) => MediaRecorder.isTypeSupported(t));
}

export function useCanvasRecord(getCanvas: () => HTMLCanvasElement | null) {
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [state, setState] = useState<RecordState>("idle");
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (!rec || rec.state === "inactive") {
      setState("idle");
      return;
    }
    rec.stop();
  }, []);

  const toggle = useCallback(() => {
    if (state === "recording") {
      stop();
      return;
    }
    const canvas = getCanvas();
    if (!canvas || typeof canvas.captureStream !== "function") return;
    const mime = pickMime();
    if (!mime) return;
    const stream = canvas.captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: mime });
    chunks.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunks.current, { type: mime });
      chunks.current = [];
      recRef.current = null;
      setState("idle");
      setStartedAt(null);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.href = url;
      a.download = `ripple-${stamp}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    };
    recRef.current = rec;
    rec.start(500);
    setState("recording");
    setStartedAt(Date.now());
  }, [getCanvas, state, stop]);

  return { state, startedAt, toggle };
}
