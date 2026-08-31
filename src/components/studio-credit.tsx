import { Github, Heart } from "lucide-react";
import { VOIDRIDE_LATEST, VOIDRIDE_PROFILE } from "@/lib/voidride";
import { VoidrideListen, useVoidrideLatest } from "./voidride-hold";

export const GITHUB_REPO = "maximusmaximus/ripple";
export const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;

function openOutside(url: string): boolean {
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) {
      w.opener = null;
      return true;
    }
  } catch {
    /* iframe / popup blocked */
  }
  return false;
}

function RippleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <circle cx="50" cy="50" r="8" fill="currentColor" />
      <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" strokeWidth="6" opacity="0.72" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.38" />
    </svg>
  );
}

export function StudioCredit() {
  const drop = useVoidrideLatest() ?? VOIDRIDE_LATEST;
  return (
    <div
      data-studio-credit="true"
      className="flex shrink-0 flex-col items-stretch border-t border-line pt-2"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          e.preventDefault();
          if (!openOutside(GITHUB_URL)) {
            void navigator.clipboard.writeText(GITHUB_URL).catch(() => {});
          }
        }}
        className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl px-4 text-fg/90 hover:bg-fg/8 hover:text-fg"
        aria-label="Ripple on GitHub"
      >
        <RippleMark className="size-8 text-ripple" />
        <span className="flex flex-col items-start leading-tight">
          <span className="text-sm font-semibold uppercase tracking-[0.2em]">Ripple</span>
          <span className="inline-flex items-center gap-1 pt-0.5 text-[11px] text-muted">
            <Github className="size-3" strokeWidth={1.75} />
            {GITHUB_REPO}
          </span>
        </span>
      </a>
      <p className="flex items-center justify-center gap-1 px-4 pb-2.5 whitespace-nowrap text-[10px] leading-none text-subtle">
        Made with
        <Heart className="size-3 shrink-0 fill-rose-400 text-rose-400" strokeWidth={0} aria-hidden />
        in SF with support from
        <a
          href={VOIDRIDE_PROFILE}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.preventDefault();
            if (!openOutside(VOIDRIDE_PROFILE)) {
              void navigator.clipboard.writeText(VOIDRIDE_PROFILE).catch(() => {});
            }
          }}
          className="voidride-mark"
        >
          VOIDRIDE
        </a>
      </p>
      <div data-voidride-latest="true" className="voidride-latest">
        <img
          src={drop.art}
          alt=""
          className="voidride-latest-art"
          onError={(e) => {
            e.currentTarget.src = "/studio/voidride-latest.jpg";
          }}
        />
        <div className="voidride-latest-shade" aria-hidden />
        <div className="voidride-latest-copy">
          <a
            href={drop.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              if (!openOutside(drop.url)) {
                void navigator.clipboard.writeText(drop.url).catch(() => {});
              }
            }}
            className="min-w-0"
            aria-label={`${drop.title} on SoundCloud`}
          >
            <span className="block text-[10px] font-medium uppercase tracking-[0.22em] text-fg/55">Latest</span>
            <span className="mt-0.5 block truncate text-base font-semibold tracking-wide text-fg">{drop.title}</span>
            {drop.album && drop.album !== drop.title ? (
              <span className="mt-0.5 block truncate text-[11px] uppercase tracking-[0.14em] text-fg/65">
                {drop.album}
              </span>
            ) : null}
          </a>
          <VoidrideListen drop={drop} className="mt-2 self-start" />
        </div>
      </div>
    </div>
  );
}
