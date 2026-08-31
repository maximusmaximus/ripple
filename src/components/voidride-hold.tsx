import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { VOIDRIDE_HOLD_MS, VOIDRIDE_LATEST, VOIDRIDE_PROFILE, type VoidrideRelease } from "@/lib/voidride";
import { readCachedVoidride, writeCachedVoidride } from "@/lib/ripple/session-resume";

export function useVoidrideLatest() {
  const [drop, setDrop] = useState<VoidrideRelease | null>(() => readCachedVoidride());
  useEffect(() => {
    let live = true;
    void fetch("/api/voidride", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: VoidrideRelease | null) => {
        if (!live || !body?.title || !body?.url) return;
        setDrop(body);
        writeCachedVoidride(body);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return drop;
}

export function useVoidrideGate() {
  const [locked, setLocked] = useState(true);
  const [flash, setFlash] = useState(false);
  const [progress, setProgress] = useState(0.04);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const done = () => {
      setProgress(1);
      setLocked(false);
    };
    const tick = () => {
      const t = (performance.now() - start) / VOIDRIDE_HOLD_MS;
      if (t >= 1) {
        done();
        return;
      }
      setProgress(Math.max(0.04, t));
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    const failsafe = window.setTimeout(done, VOIDRIDE_HOLD_MS + 50);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(failsafe);
    };
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

export function VoidrideListen({
  drop,
  className = "",
}: {
  drop: VoidrideRelease;
  className?: string;
}) {
  return (
    <a
      href={drop.url}
      target="_blank"
      rel="noopener noreferrer"
      className={
        "inline-flex min-h-11 items-center justify-center gap-1 rounded-full bg-white px-3.5 py-2 text-[12px] font-semibold text-ink transition hover:bg-white/90 " +
        className
      }
    >
      Listen {drop.title}
      <ChevronRight className="size-3.5" />
    </a>
  );
}

export function VoidrideHold({
  progress,
  fullScreen = false,
  quiet = false,
}: {
  progress?: number;
  fullScreen?: boolean;
  quiet?: boolean;
}) {
  const drop = useVoidrideLatest();
  const shown = drop ?? VOIDRIDE_LATEST;
  const ready = drop != null;
  const fill = Math.max(0.04, Math.min(1, progress ?? (quiet ? 1 : 0.04)));
  const pct = Math.round(fill * 100);

  return (
    <div
      className={
        fullScreen
          ? "voidride-hold relative size-full min-h-dvh overflow-hidden bg-ink"
          : "voidride-hold relative min-h-[22rem] w-full overflow-hidden rounded-2xl bg-ink"
      }
      data-voidride-ready={ready ? "1" : "0"}
      data-voidride-title={ready ? shown.title : ""}
    >
      <img
        src={shown.art}
        alt={ready ? `${shown.album} — ${shown.title}` : "VOIDRIDE"}
        className="absolute inset-0 size-full object-cover"
        decoding="async"
        fetchPriority="high"
        onError={(e) => {
          const el = e.currentTarget;
          if (el.dataset.fallback === "2") return;
          if (el.dataset.fallback === "1") {
            el.dataset.fallback = "2";
            el.src = VOIDRIDE_LATEST.art;
            return;
          }
          el.dataset.fallback = "1";
          el.src = "/studio/voidride-latest.jpg";
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20" />

      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-4 pt-12 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {!quiet && (
          <div className="voidride-load-chip">
            <p className="voidride-load-label">{`Loading ${pct}%`}</p>
            <span className="voidride-load-bar" aria-hidden>
              <span style={{ transform: `scaleX(${fill})` }} />
            </span>
          </div>
        )}
        <p className="text-sm font-medium text-white">
          Brought to you by{" "}
          <a href={VOIDRIDE_PROFILE} target="_blank" rel="noopener noreferrer" className="voidride-mark">
            VOIDRIDE
          </a>
        </p>
        {ready ? (
          <>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/55">Latest</p>
            <p className="text-lg font-semibold tracking-wide text-white">{shown.title}</p>
            {shown.album && shown.album !== shown.title ? (
              <a
                href={shown.albumUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] uppercase tracking-[0.18em] text-white/70 hover:text-white"
              >
                {shown.album}
              </a>
            ) : null}
            <VoidrideListen drop={shown} className="mt-1" />
          </>
        ) : null}
      </div>
    </div>
  );
}
