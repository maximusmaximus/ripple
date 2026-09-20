import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { RecNotice } from "@/lib/ripple/rec-save";
import { ClipStage } from "./clip-takes";

export function ClipNotice({
  notice,
  onSaveAlways,
  onSkip,
  onDismiss,
}: {
  notice: RecNotice | null;
  onSaveAlways?: () => void;
  onSkip?: () => void;
  onDismiss?: () => void;
}) {
  const savedTimer = useRef(0);

  useEffect(() => {
    window.clearTimeout(savedTimer.current);
    if (notice?.mode !== "saved") return;
    savedTimer.current = window.setTimeout(() => onDismiss?.(), 3200);
    return () => window.clearTimeout(savedTimer.current);
  }, [notice?.mode, notice?.clip?.url, onDismiss]);

  if (!notice || typeof document === "undefined") return null;

  const asking = notice.mode === "ask";
  const saved = notice.mode === "saved";
  const playing = notice.mode === "play";

  return createPortal(
    <aside
      data-ui-chrome
      data-clip-notice={notice.mode}
      data-clip-ask={asking ? "1" : "0"}
      data-clip-saved={saved ? "1" : "0"}
      className="clip-notice pointer-events-auto fixed top-[4.75rem] right-[max(0.75rem,env(safe-area-inset-right))] z-[90] w-[min(15.5rem,calc(100vw-1.5rem))] rounded-2xl border border-line bg-ink/92 p-2 shadow-2xl backdrop-blur-md"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2 px-0.5">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-subtle">
          {saved ? "Saved" : asking ? "Save takes" : "Take"}
        </p>
        <button
          type="button"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:text-fg"
          aria-label="Dismiss"
          onClick={() => (asking ? onSkip?.() : onDismiss?.())}
        >
          <X className="size-3.5" />
        </button>
      </div>
      {notice.clip ? <ClipStage clip={notice.clip} compact className="mt-1.5" /> : null}
      {asking ? (
        <>
          <p className="mt-2 px-0.5 text-[12px] leading-snug text-fg/90">
            {notice.clip
              ? "Save this take to this computer? Later ones save on their own."
              : "Save takes to this computer? After this, they save on their own."}
          </p>
          <button
            type="button"
            data-clip-save-always="true"
            className="mt-2 flex min-h-10 w-full items-center justify-center rounded-full bg-fg px-3 text-[13px] font-semibold text-ink"
            onClick={() => onSaveAlways?.()}
          >
            Save from now on
          </button>
          <button
            type="button"
            data-clip-save-skip="true"
            className="mt-1 flex min-h-9 w-full items-center justify-center rounded-full px-3 text-[12px] text-muted hover:text-fg"
            onClick={() => onSkip?.()}
          >
            Not now
          </button>
        </>
      ) : saved ? (
        <p className="mt-1.5 px-0.5 text-[12px] leading-snug text-muted">Saved to this computer.</p>
      ) : playing ? (
        <p className="mt-1.5 px-0.5 text-[12px] leading-snug text-muted">Tap play to watch.</p>
      ) : null}
    </aside>,
    document.body,
  );
}
