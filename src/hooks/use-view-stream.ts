import { useEffect, type RefObject } from "react";
import { encodeCamB64 } from "@/lib/ripple/cast";
import { grabSurfaceJpeg } from "@/lib/ripple/view-frame";

const INTERVAL_MS = 180;

/** When watchers are connected, push JPEG frames of the host canvas. */
export function useViewStream(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  broadcast: ((msg: { t: "view"; b64: string }) => void) | undefined,
  viewerCount: number,
) {
  useEffect(() => {
    if (!broadcast || viewerCount < 1) return;
    let alive = true;
    let busy = false;
    const tick = async () => {
      if (!alive) return;
      const canvas = canvasRef.current;
      if (canvas && !document.hidden && !busy) {
        busy = true;
        try {
          const buf = await grabSurfaceJpeg(canvas);
          if (buf && alive) broadcast({ t: "view", b64: encodeCamB64(buf) });
        } catch {
          /* drop frame */
        } finally {
          busy = false;
        }
      }
      if (alive) window.setTimeout(() => void tick(), INTERVAL_MS);
    };
    void tick();
    return () => {
      alive = false;
    };
  }, [broadcast, canvasRef, viewerCount]);
}
