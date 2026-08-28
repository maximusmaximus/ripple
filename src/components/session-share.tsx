import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Share2, X } from "lucide-react";
import { TipCopy, TipMark } from "./tip-mark";

export type SessionShareValue = {
  title: string;
  description: string;
  watchable: boolean;
};

export const EMPTY_SHARE: SessionShareValue = {
  title: "",
  description: "",
  watchable: false,
};

function watchUrlFor(code: string) {
  if (typeof window === "undefined") return `/?mode=watch&c=${code}`;
  const u = new URL(window.location.href);
  u.search = "";
  u.searchParams.set("mode", "watch");
  u.searchParams.set("c", code);
  return u.toString();
}

function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={
        "flex h-7 w-11 shrink-0 items-center rounded-full border p-0.5 transition " +
        (on ? "border-fg/70 bg-fg/25" : "border-line bg-fg/8")
      }
    >
      <span
        className={
          "size-5 rounded-full bg-fg shadow-sm transition-transform " +
          (on ? "translate-x-4" : "translate-x-0")
        }
      />
    </button>
  );
}

export function SessionShare({
  code,
  value,
  onChange,
  occupied = false,
}: {
  code: string;
  value: SessionShareValue;
  onChange: (next: SessionShareValue) => void;
  occupied?: boolean;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wasReady = useRef(false);
  const url = watchUrlFor(code);
  const ready = value.title.trim().length > 0 && value.description.trim().length > 0;
  const listed = value.watchable && ready && !occupied;

  useEffect(() => {
    if (ready && !wasReady.current) setShareOpen(true);
    wasReady.current = ready;
  }, [ready]);

  const setWatchable = (on: boolean) => {
    if (on && (!ready || occupied)) return;
    onChange({ ...value, watchable: on });
    if (on) setShareOpen(true);
  };

  const toggleWatchable = () => setWatchable(!(value.watchable && ready));

  const listMix = () => setWatchable(true);

  const copy = async () => {
    listMix();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const share = async () => {
    listMix();
    try {
      if (navigator.share) {
        await navigator.share({ title: value.title || "Ripple", text: value.description, url });
        return;
      }
    } catch {
      /* user cancel */
    }
    await copy();
  };

  const popup =
    shareOpen && ready && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[220] flex items-center justify-center p-4"
            role="presentation"
            data-watch-share="open"
            data-ui-chrome="true"
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setShareOpen(false);
            }}
          >
            <div className="absolute inset-0 bg-ink/70 backdrop-blur-[3px]" />
            <div
              role="dialog"
              aria-label="Share watch link"
              className="relative z-10 flex w-full max-w-[min(92vw,400px)] flex-col gap-3 rounded-3xl border border-line bg-ink/95 p-5 shadow-2xl"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-subtle">Watch link</p>
                  <h3 className="mt-1 text-base font-semibold text-fg">{value.title}</h3>
                  <p className="mt-0.5 text-sm text-muted">{value.description}</p>
                </div>
                <button
                  type="button"
                  className="flex size-9 items-center justify-center rounded-full border border-line text-muted hover:text-fg"
                  onClick={() => setShareOpen(false)}
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
              <p className="break-all rounded-xl border border-line bg-fg/5 px-3 py-2 font-mono text-[12px] text-fg/90">
                {url}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void copy()}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-fg/8 text-sm text-fg hover:bg-fg/12"
                >
                  <Copy className="size-3.5" />
                  {copied ? "Copied" : "Copy link"}
                </button>
                <button
                  type="button"
                  onClick={() => void share()}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-ripple/40 bg-ripple/15 text-sm text-fg hover:bg-ripple/25"
                >
                  <Share2 className="size-3.5" />
                  Share
                </button>
              </div>
              {!listed ? (
                <button
                  type="button"
                  onClick={listMix}
                  className="flex min-h-11 items-center justify-center rounded-xl border border-emerald-400/50 bg-emerald-500/15 text-sm font-semibold text-emerald-50 hover:bg-emerald-500/25"
                >
                  List this mix
                </button>
              ) : (
                <p className="text-center text-[11px] text-emerald-200/90">Listed — others can watch, not paint.</p>
              )}
              <p className="text-center text-[11px] text-subtle">Watchers see the mix. They cannot paint.</p>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="flex flex-col gap-2" data-session-share="true">
      <label className="flex flex-col gap-1">
        <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
          Title
          <TipMark id="live" />
        </span>
        <input
          type="text"
          maxLength={48}
          value={value.title}
          onChange={(e) => {
            const title = e.target.value;
            onChange({
              ...value,
              title,
              watchable: value.watchable && title.trim().length > 0 && value.description.trim().length > 0,
            });
          }}
          placeholder="Name this mix"
          className="min-h-11 rounded-xl border border-line bg-fg/5 px-3 text-sm text-fg outline-none placeholder:text-subtle focus:border-fg/40"
          suppressHydrationWarning
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[12px] text-muted">Description</span>
        <textarea
          maxLength={140}
          rows={2}
          value={value.description}
          onChange={(e) => {
            const description = e.target.value;
            onChange({
              ...value,
              description,
              watchable: value.watchable && value.title.trim().length > 0 && description.trim().length > 0,
            });
          }}
          placeholder="What are you painting"
          className="resize-none rounded-xl border border-line bg-fg/5 px-3 py-2 text-sm text-fg outline-none placeholder:text-subtle focus:border-fg/40"
          suppressHydrationWarning
        />
      </label>
      <div className="flex items-center justify-between gap-2 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          Watchable
          <TipMark id="live" />
        </span>
        <Switch on={listed} onToggle={toggleWatchable} label="Watchable" />
      </div>
      <TipCopy>
        Watchable lists this mix for others. They see the title and description, then watch only — they cannot paint. Needs a title and a short description.
      </TipCopy>
      {!ready && (
        <p className="text-[11px] text-subtle">Add a title and description before turning Watchable on.</p>
      )}
      {occupied && (
        <p className="text-[11px] text-amber-200/90">
          Another mix is already listed. Watchable stays off until that one ends.
        </p>
      )}
      {ready && listed && (
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="min-h-11 rounded-xl border border-line bg-fg/5 text-sm text-fg hover:bg-fg/10"
        >
          Share watch link
        </button>
      )}
      {popup}
    </div>
  );
}
