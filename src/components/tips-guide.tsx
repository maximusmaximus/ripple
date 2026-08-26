import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { GUIDE_BY_ID, GUIDE_TIPS } from "@/lib/ripple/guides";
import { useRippleStore } from "@/store/ripple";

export function TipsGuide() {
  const on = useRippleStore((s) => s.tipsOn);
  const setTipsOn = useRippleStore((s) => s.setTipsOn);
  const openId = useRippleStore((s) => s.openTipId);
  const setOpenTip = useRippleStore((s) => s.setOpenTip);
  const tip = (openId && GUIDE_BY_ID[openId]) || GUIDE_TIPS[0]!;
  const index = Math.max(0, GUIDE_TIPS.findIndex((t) => t.id === tip.id));

  const go = (dir: -1 | 1) => {
    const next = GUIDE_TIPS[(index + dir + GUIDE_TIPS.length) % GUIDE_TIPS.length]!;
    setOpenTip(next.id);
  };

  return (
    <div
      data-ui-chrome
      className="pointer-events-none absolute bottom-[max(5.75rem,calc(env(safe-area-inset-bottom)+4.5rem))] right-3 z-[45] flex w-[min(18.5rem,calc(100vw-1.5rem))] flex-col items-end gap-2"
    >
      {on && (
        <div className="pointer-events-auto w-full rounded-2xl border border-line bg-ink/90 p-3 text-fg shadow-2xl backdrop-blur-xl">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">Walkthrough</p>
            <p className="font-mono text-[10px] tabular-nums text-muted">
              {index + 1} / {GUIDE_TIPS.length}
            </p>
          </div>
          <h2 className="mt-1 text-sm font-medium text-fg">{tip.title}</h2>
          <p className="mt-1 text-[12px] leading-snug text-muted">{tip.body}</p>
          <p className="mt-2 text-[10px] text-subtle">Tap any i on a control for that feature.</p>
          <div className="mt-2.5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => go(-1)}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-fg/8 px-2.5 py-1 text-[11px] text-fg/85 hover:bg-fg/15"
            >
              <ChevronLeft className="size-3.5" />
              Back
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="inline-flex items-center gap-1 rounded-full bg-fg/18 px-2.5 py-1 text-[11px] font-medium text-fg hover:bg-fg/28"
            >
              Next
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setTipsOn(!on)}
        className={
          "pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition " +
          (on
            ? "border-fg/70 bg-fg text-ink"
            : "border-line bg-ink/55 text-fg/85 hover:bg-ink/70 hover:text-fg")
        }
        aria-label={on ? "Turn tips off" : "Turn tips on"}
        aria-pressed={on}
        title={on ? "Tips on" : "Tips"}
      >
        <Info className="size-4" strokeWidth={1.85} />
      </button>
    </div>
  );
}
