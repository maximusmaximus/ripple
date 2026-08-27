import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Lightbulb, Monitor } from "lucide-react";
import type { useCastHost } from "@/hooks/use-cast-host";
import { VOIDRIDE_HOLD_MS } from "@/lib/voidride";
import { QrMark } from "./qr-mark";
import { VoidrideHold, useVoidrideGate } from "./voidride-hold";

type Host = ReturnType<typeof useCastHost>;

export function PairOverlay({
  host,
  onDismiss,
  skipHold = false,
}: {
  host: Host;
  onDismiss: () => void;
  skipHold?: boolean;
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
  const [codeIn, setCodeIn] = useState("");
  const navigate = useNavigate({ from: "/" });
  const { locked, flash, nudge, progress } = useVoidrideGate();

  useEffect(() => {
    if (ready) return;
    const t = window.setTimeout(() => setGaveUp(true), VOIDRIDE_HOLD_MS + 800);
    return () => window.clearTimeout(t);
  }, [ready]);

  const tryDismiss = () => {
    if (!skipHold && nudge()) return;
    onDismiss();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (!skipHold && nudge()) return;
      onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nudge, onDismiss, skipHold]);

  const showHold = !skipHold && (locked || (!ready && !gaveUp));
  const joinCode = codeIn.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  const joinDesktop = () => {
    if (joinCode.length < 4) return;
    void navigate({ search: { mode: "pad", c: joinCode } });
  };

  return (
    <div
      data-ui-chrome
      data-pair-overlay="true"
      className="absolute inset-0 z-[80] flex flex-col items-center justify-center p-4"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-ink/55 backdrop-blur-[2px]"
        aria-hidden
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          tryDismiss();
        }}
      />

      <div
        role="dialog"
        aria-label="Pair with a larger screen"
        className="relative z-10 flex w-full max-w-[min(92vw,400px)] flex-col gap-4 overflow-hidden rounded-3xl border border-line bg-ink/90 p-6 shadow-2xl backdrop-blur-xl md:hidden"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center gap-2 text-fg">
          <Lightbulb className="size-5 text-amber-200" strokeWidth={1.75} />
          <Monitor className="size-5 text-fg/80" strokeWidth={1.75} />
        </div>
        <div className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-subtle">Pair screens</p>
          <h2 className="mt-1 text-lg font-semibold text-fg">Scan the desktop</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Scan this code from another device, or type the six-character code. Tap outside to paint on this screen.
          </p>
        </div>
        <div className="mx-auto rounded-2xl bg-fg p-2.5">
          {host.pairUrl ? (
            <QrMark value={host.pairUrl} size={180} />
          ) : (
            <div className="flex size-[180px] items-center justify-center text-ink/50">Getting a code…</div>
          )}
        </div>
        <p className="text-center font-mono text-xl tracking-[0.35em] text-fg">{host.code || "------"}</p>
        <ol className="space-y-2 text-left text-[13px] text-fg/85">
          <li className="flex gap-2">
            <span className="font-mono text-[11px] text-subtle">1</span>
            Open the same site on the large screen.
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-[11px] text-subtle">2</span>
            Point this camera at the QR on that screen.
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-[11px] text-subtle">3</span>
            Or type the six-character code below.
          </li>
        </ol>
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            joinDesktop();
          }}
        >
          <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-subtle" htmlFor="pair-code">
            Desktop code
          </label>
          <input
            id="pair-code"
            name="code"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={8}
            value={codeIn}
            onChange={(e) => setCodeIn(e.target.value.toUpperCase())}
            placeholder="A2B3C4"
            className="h-12 rounded-2xl border border-line bg-fg/5 px-4 text-center font-mono text-lg tracking-[0.28em] text-fg outline-none placeholder:text-subtle/70 focus:border-fg/40"
          />
          <button
            type="submit"
            disabled={joinCode.length < 4}
            className="flex min-h-12 items-center justify-center rounded-2xl border border-line bg-fg px-4 text-sm font-semibold text-ink transition disabled:opacity-40"
          >
            Connect to desktop
          </button>
        </form>
        <p className="text-center text-[11px] text-subtle">
          Tap outside to close. You can keep painting on this phone until you connect.
        </p>
      </div>

      <div
        role="dialog"
        aria-label="Connect secondary device"
        className={
          "relative z-10 hidden w-full max-w-[min(92vw,420px)] flex-col items-center overflow-hidden rounded-3xl border border-line bg-ink/85 shadow-2xl backdrop-blur-xl md:flex" +
          (flash ? " voidride-edge-flash" : "")
        }
        onPointerDown={(e) => e.stopPropagation()}
      >
        {showHold ? (
          <VoidrideHold progress={progress} />
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
