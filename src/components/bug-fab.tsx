import { useEffect, useState } from "react";
import { Bug } from "lucide-react";
import { useRippleStore } from "@/store/ripple";
import { FeedbackComposer } from "./feedback-form";

export function BugFab() {
  const [open, setOpen] = useState(false);
  const tipsOn = useRippleStore((s) => s.tipsOn);
  const setTipsOn = useRippleStore((s) => s.setTipsOn);

  useEffect(() => {
    if (tipsOn && open) setOpen(false);
  }, [tipsOn, open]);

  return (
    <div
      data-ui-chrome
      className="bug-guide pointer-events-none absolute z-[45] flex w-[min(18.5rem,calc(100vw-1.5rem))] flex-col items-start gap-2"
    >
      {open && (
        <div
          className="pointer-events-auto w-full rounded-2xl border border-line bg-ink/90 p-3 text-fg shadow-2xl backdrop-blur-xl"
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">Report a bug</p>
          <div className="mt-2">
            <FeedbackComposer
              defaultKind="bug"
              fieldId="ripple-bug-body"
              onCancel={() => setOpen(false)}
              framed={false}
            />
          </div>
        </div>
      )}
      <button
        type="button"
        data-bug-fab="true"
        onClick={() => {
          const next = !open;
          if (next && tipsOn) setTipsOn(false);
          setOpen(next);
        }}
        className={
          "pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition " +
          (open
            ? "border-fg/70 bg-fg text-ink"
            : "border-line bg-ink/55 text-fg/85 hover:bg-ink/70 hover:text-fg")
        }
        aria-label={open ? "Close bug form" : "Report a bug"}
        aria-pressed={open}
        title={open ? "Close" : "Report a bug"}
      >
        <Bug className="size-4" strokeWidth={1.85} />
      </button>
    </div>
  );
}
