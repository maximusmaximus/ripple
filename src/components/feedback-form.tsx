import { useLayoutEffect, useRef, useState } from "react";
import { Bug, Check, Copy, Lightbulb, Send } from "lucide-react";
import { submitStudioFeedback } from "@/lib/ripple/studio-api";
import { TipMark, TipCopy } from "./tip-mark";

type Kind = "feature" | "bug";
type Sent = { number: number; url: string; kind: Kind };

const MIN_BODY = 8;
const MAX_BODY = 2000;

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

export function FeedbackFooter() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("feature");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (!open && !sent) return;
    const card = cardRef.current;
    const dock = card?.closest(".controls-dock-scroll");
    if (card && dock instanceof HTMLElement) {
      const c = card.getBoundingClientRect();
      const d = dock.getBoundingClientRect();
      const pad = 10;
      if (c.bottom > d.bottom - pad || c.top < d.top + pad) {
        dock.scrollTop += c.top - d.top - pad;
      }
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (open) textRef.current?.focus({ preventScroll: true });
  }, [open, sent]);

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const send = async () => {
    if (busy) return;
    const text = body.trim();
    if (text.length < MIN_BODY) {
      setError("A little more detail helps — at least a sentence.");
      textRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await submitStudioFeedback({ data: { kind, body: text } });
      setBody("");
      if (res.issue?.url) {
        setSent({ number: res.issue.number, url: res.issue.url, kind });
        setOpen(false);
      } else {
        setSent(null);
        setOpen(true);
        setError(res.githubError || "Saved here, but GitHub did not open an issue. Try once more in a moment.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      ref={cardRef}
      data-feedback-form="true"
      className="flex flex-col gap-2 pt-1"
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-subtle">
          Feature & bugs
          <TipMark id="feedback" />
        </h3>
      </div>

      {sent && (
        <div
          className="flex flex-col gap-2 rounded-2xl border border-line bg-fg/8 p-3"
          role="status"
          aria-live="polite"
        >
          <p className="inline-flex items-center gap-2 text-sm font-medium text-fg">
            <Check className="size-4 text-fg" strokeWidth={2.25} />
            Sent as #{sent.number}
          </p>
          <p className="text-[12px] leading-snug text-muted">
            {sent.kind === "bug" ? "Bug report" : "Feature request"} is on the studio list.
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (!openOutside(sent.url)) void copyLink(sent.url);
              }}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-fg/10 px-3 text-sm font-medium text-fg hover:bg-fg/18"
            >
              Open #{sent.number}
            </button>
            <button
              type="button"
              onClick={() => void copyLink(sent.url)}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-line bg-fg/5 px-3 text-sm text-muted hover:bg-fg/12 hover:text-fg"
            >
              <Copy className="size-3.5" />
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setSent(null);
              setOpen(true);
              setError(null);
            }}
            className="min-h-11 rounded-xl text-sm text-muted hover:text-fg"
          >
            Write another
          </button>
        </div>
      )}

      {!sent && !open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setError(null);
          }}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-fg/5 px-3 text-sm text-muted hover:bg-fg/10 hover:text-fg"
        >
          <Send className="size-3.5" />
          Feature request or bug
        </button>
      )}

      {!sent && open && (
        <form
          className="flex flex-col gap-2 rounded-2xl border border-line bg-fg/8 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <TipCopy>
            Lands on the public list as a tracked issue. First line becomes the title.
          </TipCopy>
          <div role="tablist" aria-label="Note type" className="grid grid-cols-2 gap-1 rounded-xl bg-ink/50 p-1">
            <button
              type="button"
              role="tab"
              aria-selected={kind === "feature"}
              onClick={() => setKind("feature")}
              className={
                "flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-sm " +
                (kind === "feature" ? "bg-fg/15 text-fg" : "text-muted hover:bg-fg/10 hover:text-fg")
              }
            >
              <Lightbulb className="size-3.5" />
              Feature
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={kind === "bug"}
              onClick={() => setKind("bug")}
              className={
                "flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-sm " +
                (kind === "bug" ? "bg-fg/15 text-fg" : "text-muted hover:bg-fg/10 hover:text-fg")
              }
            >
              <Bug className="size-3.5" />
              Bug
            </button>
          </div>
          <label className="sr-only" htmlFor="ripple-feedback-body">
            {kind === "bug" ? "What broke?" : "What should this do?"}
          </label>
          <textarea
            id="ripple-feedback-body"
            ref={textRef}
            name="ripple-feedback"
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (error) setError(null);
            }}
            onFocus={() => {
              window.scrollTo(0, 0);
              document.documentElement.scrollTop = 0;
              document.body.scrollTop = 0;
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void send();
              }
            }}
            maxLength={MAX_BODY}
            rows={5}
            enterKeyHint="send"
            autoComplete="off"
            disabled={busy}
            placeholder={kind === "bug" ? "What broke, and on which screen?" : "What should this do that it does not?"}
            className="min-h-28 w-full resize-none rounded-xl border border-line bg-ink/70 px-3 py-2.5 text-base leading-snug text-fg outline-none placeholder:text-subtle focus:border-fg/35"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[11px] tabular-nums text-subtle">
              {body.trim().length}/{MAX_BODY}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="rounded-lg px-2 py-1 text-[12px] text-muted hover:text-fg"
            >
              Cancel
            </button>
          </div>
          {error && (
            <p className="text-[12px] leading-snug text-amber-200/90" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-fg px-3 text-sm font-medium text-ink hover:bg-fg/90 disabled:opacity-40"
          >
            <Send className="size-3.5" />
            {busy ? "Sending…" : kind === "bug" ? "Send bug" : "Send request"}
          </button>
        </form>
      )}
    </div>
  );
}
