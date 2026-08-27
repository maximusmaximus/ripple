import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { VOIDRIDE_HOLD_MS, VOIDRIDE_LATEST, VOIDRIDE_PROFILE } from "@/lib/voidride";

export function useVoidrideGate() {
  const [locked, setLocked] = useState(true);
  const [flash, setFlash] = useState(false);
  const [progress, setProgress] = useState(0.04);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const t = (performance.now() - start) / VOIDRIDE_HOLD_MS;
      if (t >= 1) {
        setProgress(1);
        setLocked(false);
        return;
      }
      setProgress(Math.max(0.04, t));
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);
  const nudge = () => {
    if (!locked) return false;
    setFlash(false);
    window.requestAnimationFrame(() => setFlash(true));
    window.setTimeout(() => setFlash(false), 700);
    return true;
  };
  return { locked, flash, nudge, progress };
}

export function VoidrideHold({
  progress,
  fullScreen = false,
}: {
  progress?: number;
  fullScreen?: boolean;
}) {
  const drop = VOIDRIDE_LATEST;
  const fill = Math.max(0.04, Math.min(1, progress ?? 0.04));
  const pct = Math.round(fill * 100);

  return (
    <div
      className={
        fullScreen
          ? "voidride-hold relative size-full min-h-dvh overflow-hidden bg-ink"
          : "voidride-hold relative min-h-[22rem] w-full overflow-hidden rounded-2xl bg-ink"
      }
    >
      <img
        src={drop.art}
        alt={`${drop.title} album art`}
        className="absolute inset-0 size-full object-cover"
        decoding="async"
        fetchPriority="high"
        onError={(e) => {
          const el = e.currentTarget;
          if (el.dataset.fallback) return;
          el.dataset.fallback = "1";
          el.src = "https://i1.sndcdn.com/artworks-EBNFdPf8REoyKlxC-sn2PPg-t500x500.jpg";
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20" />

      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-4 pt-12 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="voidride-load-chip">
          <p className="voidride-load-label">{`Loading ${pct}%`}</p>
          <span className="voidride-load-bar" aria-hidden>
            <span style={{ transform: `scaleX(${fill})` }} />
          </span>
        </div>
        <p className="text-sm font-medium text-white">
          Brought to you by{" "}
          <a href={VOIDRIDE_PROFILE} target="_blank" rel="noopener noreferrer" className="voidride-mark">
            VOIDRIDE
          </a>
        </p>
        <p className="text-[12px] leading-snug text-white/80">Listen to NEW Releases on SoundCloud</p>
        <p className="mt-0.5 text-lg font-semibold tracking-wide text-white">{drop.title}</p>
        <a
          href={drop.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex min-h-11 w-fit items-center gap-1 rounded-full bg-white px-3.5 py-2 text-[12px] font-semibold text-ink transition hover:bg-white/90"
        >
          Listen Now
          <ChevronRight className="size-3.5" />
        </a>
      </div>
    </div>
  );
}
