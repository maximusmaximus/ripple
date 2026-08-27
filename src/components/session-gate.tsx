import { Eye, Plus } from "lucide-react";
import type { LiveInfo } from "@/hooks/use-live-presence";

export function SessionGate({
  session,
  onWatch,
  onNew,
}: {
  session: LiveInfo;
  onWatch: () => void;
  onNew: () => void;
}) {
  const n = session.viewers;
  const watching = n <= 0 ? "Live now" : n === 1 ? "1 watching" : `${n} watching`;

  return (
    <div
      data-ui-chrome
      data-session-gate="open"
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4"
      role="presentation"
    >
      <div className="absolute inset-0 bg-ink/70 backdrop-blur-[3px]" aria-hidden />
      <div
        role="dialog"
        aria-label="Join a live session"
        className="relative z-10 flex w-full max-w-[min(92vw,400px)] flex-col gap-4 overflow-hidden rounded-3xl border border-line bg-ink/90 p-6 shadow-2xl backdrop-blur-xl"
      >
        <div className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-subtle">Live session</p>
          <h2 className="mt-1 text-lg font-semibold text-fg">A studio is already going</h2>
          <p className="mt-1 text-sm text-muted">
            Watch the live surface, or start a private mix of your own.
          </p>
          <p className="mt-2 text-[12px] text-emerald-200/90">{watching}</p>
        </div>

        <button
          type="button"
          onClick={onWatch}
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-400/50 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-500/25"
        >
          <Eye className="size-4" strokeWidth={2} />
          Watch LIVE session
        </button>
        <button
          type="button"
          onClick={onNew}
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-fg/5 px-4 py-3 text-sm font-medium text-fg transition hover:bg-fg/10"
        >
          <Plus className="size-4" strokeWidth={2} />
          Make new session
        </button>
        <p className="text-center text-[11px] text-subtle">Watch is view-only. New session is yours to paint.</p>
      </div>
    </div>
  );
}
