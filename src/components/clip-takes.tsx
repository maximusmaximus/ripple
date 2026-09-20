import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { PendingClip } from "@/lib/ripple/record";

function PlayMark({ className = "size-7" }: { className?: string }) {
  return <Play className={className} fill="currentColor" strokeWidth={0} aria-hidden />;
}

export function ClipStage({
  clip,
  autoPlay = false,
  compact = false,
  className = "",
}: {
  clip: PendingClip;
  autoPlay?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setPlaying(false);
    const el = videoRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    if (autoPlay) {
      void el.play().catch(() => {});
    }
  }, [clip.url, autoPlay]);

  const start = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.ended || el.currentTime > 0.05) el.currentTime = 0;
    void el.play().catch(() => {});
  };

  const toggle = () => {
    const el = videoRef.current;
    if (!el) return;
    if (playing) el.pause();
    else start();
  };

  return (
    <div
      className={"relative overflow-hidden rounded-xl bg-ink " + className}
      data-clip-stage="true"
      data-clip-playing={playing ? "1" : "0"}
    >
      <video
        ref={videoRef}
        src={clip.url}
        className={compact ? "block h-24 w-full bg-ink object-cover" : "block aspect-video w-full bg-ink object-cover"}
        playsInline
        muted
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onClick={toggle}
      />
      {!playing && (
        <button
          type="button"
          data-clip-play="true"
          aria-label={`Play ${clip.name}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            start();
          }}
          className="absolute inset-0 z-10 flex items-center justify-center bg-ink/25"
        >
          <span
            className={
              "flex items-center justify-center rounded-full bg-fg text-ink shadow-xl transition-transform duration-150 ease-out active:scale-[0.96] " +
              (compact ? "size-10" : "size-16")
            }
          >
            <PlayMark className={compact ? "size-4 translate-x-px" : "size-7 translate-x-0.5"} />
          </span>
        </button>
      )}
      {playing && (
        <button
          type="button"
          data-clip-pause="true"
          aria-label="Pause"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            videoRef.current?.pause();
          }}
          className="absolute bottom-1.5 right-1.5 z-10 flex size-8 items-center justify-center rounded-full border border-line bg-ink/70 text-fg backdrop-blur-md"
        >
          <Pause className="size-3.5 fill-current" strokeWidth={0} />
        </button>
      )}
    </div>
  );
}

export function ClipReel({
  clips,
  onPlay,
}: {
  clips: PendingClip[];
  onPlay: (clip: PendingClip) => void;
}) {
  if (!clips.length) return null;
  return (
    <div className="flex flex-col gap-1.5" data-clip-reel="true">
      <p className="text-[12px] text-muted">Takes</p>
      <div className="grid grid-cols-4 gap-1.5">
        {clips.map((clip) => (
          <button
            key={clip.url}
            type="button"
            data-clip-thumb="true"
            title={clip.name}
            aria-label={`Play ${clip.name}`}
            onClick={() => onPlay(clip)}
            className="relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-fg/8"
          >
            <video
              src={clip.url}
              muted
              playsInline
              preload="metadata"
              className="size-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-ink/30">
              <span className="flex size-8 items-center justify-center rounded-full bg-fg text-ink">
                <PlayMark className="size-3.5 translate-x-px" />
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
