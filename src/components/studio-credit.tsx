import { Github, Heart } from "lucide-react";
import { VOIDRIDE_PROFILE } from "@/lib/voidride";
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
  const drop = useVoidrideLatest();
  return (
    <div
      data-studio-credit="true"
      className="flex shrink-0 flex-col items-center gap-1.5 border-t border-line px-4 py-2.5"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        data-voidride-latest="true"
        className="flex w-full flex-col gap-2 rounded-xl border border-line bg-fg/5 px-2 py-2"
      >
        <a
          href={drop.albumUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.preventDefault();
            if (!openOutside(drop.albumUrl)) {
              void navigator.clipboard.writeText(drop.albumUrl).catch(() => {});
            }
          }}
          className="flex min-w-0 items-center gap-3"
          aria-label={`${drop.album} on SoundCloud`}
        >
          <img
            src={drop.art}
            alt=""
            className="size-11 shrink-0 rounded-lg object-cover"
            onError={(e) => {
              e.currentTarget.src = "/studio/voidride-latest.jpg";
            }}
          />
          <span className="min-w-0">
            <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-subtle">Latest album</span>
            <span className="block truncate text-sm font-semibold text-fg">{drop.album}</span>
            <span className="block truncate text-[11px] text-muted">{drop.title}</span>
          </span>
        </a>
        <VoidrideListen drop={drop} className="w-full justify-center" />
      </div>
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
        className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-xl px-2 text-fg/90 hover:bg-fg/8 hover:text-fg"
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
      <p className="flex items-center justify-center gap-1 whitespace-nowrap text-[10px] leading-none text-subtle">
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
    </div>
  );
}
