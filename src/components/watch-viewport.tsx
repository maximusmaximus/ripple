import { useEffect, useRef } from "react";
import { Eye, Plus } from "lucide-react";
import { useCastWatch } from "@/hooks/use-cast-watch";
import { useLivePresence } from "@/hooks/use-live-presence";
import { Lightbulb } from "lucide-react";

export function WatchViewport({
  code,
  onNewSession,
}: {
  code: string;
  onNewSession: () => void;
}) {
  const watch = useCastWatch(code);
  const presence = useLivePresence({ role: "watch", code, enabled: true });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastBmp = useRef<ImageBitmap | null>(null);

  const others =
    presence.session != null ? Math.max(0, presence.session.viewers - 1) : watch.viewers;
  const connected = watch.state === "live";

  useEffect(() => {
    const frame = watch.frame;
    if (!frame) return;
    let cancelled = false;
    void (async () => {
      try {
        const blob = new Blob([frame.jpeg], { type: "image/jpeg" });
        const bmp = await createImageBitmap(blob);
        if (cancelled) {
          bmp.close();
          return;
        }
        const canvas = canvasRef.current;
        if (!canvas) {
          bmp.close();
          return;
        }
        if (canvas.width !== bmp.width || canvas.height !== bmp.height) {
          canvas.width = bmp.width;
          canvas.height = bmp.height;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          bmp.close();
          return;
        }
        ctx.drawImage(bmp, 0, 0);
        lastBmp.current?.close();
        lastBmp.current = bmp;
      } catch {
        /* drop frame */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [watch.frame]);

  useEffect(() => () => lastBmp.current?.close(), []);

  return (
    <div
      className="relative h-dvh w-dvw overflow-hidden bg-ink"
      data-watch="true"
      data-watch-state={watch.state}
      style={{ touchAction: "none" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full object-cover"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />

      {!watch.frame && watch.state !== "ended" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <p className="rounded-full border border-line bg-ink/55 px-4 py-2 text-sm text-fg/80 backdrop-blur-md">
            Connecting to live…
          </p>
        </div>
      )}

      {watch.state === "ended" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-ink/70 p-6 text-center backdrop-blur-sm">
          <p className="text-sm font-medium text-fg">Live session ended</p>
          <button
            type="button"
            onClick={onNewSession}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-fg/10 px-4 text-sm text-fg hover:bg-fg/20"
          >
            <Plus className="size-4" />
            Make new session
          </button>
        </div>
      )}

      <div
        data-ui-chrome
        className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-end p-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
      >
        <div className="pointer-events-auto flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink/55 px-2.5 py-1.5 text-[11px] font-medium text-fg/85 backdrop-blur-md">
            <Eye className="size-3.5" />
            Watch only
          </span>
          <span
            className={
              "relative flex h-11 items-center gap-1.5 rounded-full border px-2.5 backdrop-blur-md " +
              (connected
                ? "border-emerald-400/80 bg-emerald-500/25 text-emerald-100 shadow-[0_0_16px_rgba(52,211,153,0.45)]"
                : "border-line bg-ink/50 text-fg/55")
            }
            title={connected ? "Connected to live" : "Waiting for live"}
          >
            <Lightbulb className={"size-4 " + (connected ? "fill-current" : "")} strokeWidth={1.75} />
            <span className="pr-1 text-[11px] font-semibold tabular-nums" data-live-viewers={others}>
              {others}
            </span>
          </span>
          <button
            type="button"
            onClick={onNewSession}
            className="flex h-11 items-center gap-1.5 rounded-full border border-line bg-ink/55 px-3 text-[12px] text-fg/85 backdrop-blur-md hover:bg-ink/70 hover:text-fg"
          >
            <Plus className="size-3.5" />
            My session
          </button>
        </div>
      </div>
    </div>
  );
}
