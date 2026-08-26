import { useEffect, useState } from "react";
import type { useCastHost } from "@/hooks/use-cast-host";
import { QrMark } from "./qr-mark";
import { VoidrideHold } from "./voidride-hold";

type Host = ReturnType<typeof useCastHost>;

export function PairOverlay({
  host,
  onDismiss,
}: {
  host: Host;
  onDismiss: () => void;
}) {
  const heading =
    host.state === "waiting"
      ? "Connecting…"
      : host.state === "reconnecting"
        ? "Phone dropped"
        : host.isLive
          ? "Phone is live"
          : "Connect Secondary Device";

  const ready = Boolean(host.pairUrl && host.code);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (ready) return;
    const t = window.setTimeout(() => setGaveUp(true), 400);
    return () => window.clearTimeout(t);
  }, [ready]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  const showHold = !ready && !gaveUp;

  return (
    <div
      data-ui-chrome
      className="absolute inset-0 z-[80] flex flex-col items-center justify-center p-4 max-md:hidden"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-ink/55 backdrop-blur-[2px]"
        aria-hidden
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDismiss();
        }}
      />

      <div
        role="dialog"
        aria-label="Connect secondary device"
        className="relative z-10 flex w-full max-w-[min(92vw,420px)] flex-col items-center overflow-hidden rounded-3xl border border-line bg-ink/85 shadow-2xl backdrop-blur-xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {showHold ? (
          <VoidrideHold />
        ) : (
          <div className="flex w-full flex-col items-center gap-4 p-6">
            <div className="text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-subtle">Secondary device</p>
              <h2 className="mt-1 text-lg font-semibold text-fg">{heading}</h2>
              <p className="mt-1 text-sm text-muted">
                {host.state === "reconnecting"
                  ? "Scan again to take over. The menu will move back to the phone."
                  : "Scan to take the menu onto your phone. This screen becomes a clean wall. Click outside to close."}
              </p>
            </div>

            <div className="rounded-2xl bg-fg p-3 shadow-inner">
              {host.pairUrl ? (
                <QrMark value={host.pairUrl} size={220} />
              ) : (
                <div className="flex size-[220px] items-center justify-center text-ink/50">Getting a code…</div>
              )}
            </div>

            <div className="flex w-full flex-col items-center gap-1.5">
              <p className="font-mono text-2xl tracking-[0.35em] text-fg">{host.code || "------"}</p>
              <p className="text-center text-[11px] text-subtle">Same site on your phone, this code</p>
            </div>

            {host.lastError && (
              <p className="rounded-lg bg-rose-500/15 px-3 py-1.5 text-center text-xs text-rose-300">{host.lastError}</p>
            )}

            <div className="flex w-full items-center justify-center gap-2">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  host.regenerateCode();
                }}
                className="rounded-full border border-line bg-fg/5 px-4 py-1.5 text-xs text-muted transition hover:bg-fg/10 hover:text-fg"
              >
                New code
              </button>
              {host.isLive && (
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    host.disconnect();
                  }}
                  className="rounded-full border border-line bg-fg/5 px-4 py-1.5 text-xs text-muted transition hover:bg-fg/10 hover:text-fg"
                >
                  End link
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
