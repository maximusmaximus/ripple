import type { useCastHost } from "@/hooks/use-cast-host";
import { QrMark } from "./qr-mark";

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
        ? "Reconnect a phone"
        : host.isLive
          ? "Phone is live"
          : "Connect Secondary Device";

  return (
    <div
      data-ui-chrome
      className="absolute inset-0 z-[80] flex flex-col items-center justify-center p-4 max-md:hidden"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <button
        type="button"
        className="absolute inset-0 bg-ink/55 backdrop-blur-[2px]"
        aria-label="Dismiss and keep painting"
        onClick={onDismiss}
      />

      <div
        className="relative z-10 flex w-full max-w-[min(92vw,420px)] flex-col items-center gap-4 rounded-3xl border border-line bg-ink/85 p-6 shadow-2xl backdrop-blur-xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-subtle">Secondary device</p>
          <h2 className="mt-1 text-lg font-semibold text-fg">{heading}</h2>
          <p className="mt-1 text-sm text-muted">
            Scan to paint, tilt, and stream from your phone. Tap outside to keep working here.
          </p>
        </div>

        {host.pairUrl ? (
          <div className="rounded-2xl bg-fg p-3 shadow-inner">
            <QrMark value={host.pairUrl} size={220} />
          </div>
        ) : null}

        <div className="flex w-full flex-col items-center gap-1.5">
          <p className="font-mono text-2xl tracking-[0.35em] text-fg">{host.code}</p>
          <p className="text-center text-[11px] text-subtle">Same site on your phone, this code</p>
        </div>

        {host.lastError && (
          <p className="rounded-lg bg-rose-500/15 px-3 py-1.5 text-center text-xs text-rose-300">{host.lastError}</p>
        )}

        <div className="flex w-full items-center justify-center gap-2">
          <button
            type="button"
            onClick={host.regenerateCode}
            className="rounded-full border border-line bg-fg/5 px-4 py-1.5 text-xs text-muted transition hover:bg-fg/10 hover:text-fg"
          >
            New code
          </button>
          {host.isLive && (
            <button
              type="button"
              onClick={host.disconnect}
              className="rounded-full border border-line bg-fg/5 px-4 py-1.5 text-xs text-muted transition hover:bg-fg/10 hover:text-fg"
            >
              End link
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full bg-fg/15 px-4 py-1.5 text-xs font-medium text-fg hover:bg-fg/25"
          >
            Keep painting
          </button>
        </div>
      </div>
    </div>
  );
}
