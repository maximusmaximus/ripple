import { ChevronRight } from "lucide-react";
import { VOIDRIDE_LATEST, VOIDRIDE_PROFILE } from "@/lib/voidride";

export function VoidrideHold({ progress }: { progress?: number }) {
  const drop = VOIDRIDE_LATEST;
  const waiting = progress == null;
  const fill = waiting ? 0.2 : Math.max(0.04, Math.min(1, progress));
  const pct = waiting ? null : Math.round(fill * 100);

  return (
    <div
      className={
        "voidride-hold relative min-h-[22rem] w-full overflow-hidden rounded-2xl bg-ink" +
        (waiting ? " is-wait" : "")
      }
    >
      <img
        src={drop.art}
        alt={`${drop.title} album art`}
        className="absolute inset-0 size-full object-cover"
        decoding="async"
        fetchPriority="high"
        referrerPolicy="no-referrer"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20" />

      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-4 pt-12">
        <div className="voidride-load-chip">
          <p className="voidride-load-label">{pct == null ? "Loading" : `Loading ${pct}%`}</p>
          <span className="voidride-load-bar" aria-hidden>
            <span style={waiting ? undefined : { transform: `scaleX(${fill})` }} />
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
