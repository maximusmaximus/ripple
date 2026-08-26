import { useState } from "react";
import { Bug, Lightbulb, Heart } from "lucide-react";
import { submitStudioFeedback } from "@/lib/ripple/studio-api";

const ISSUES_URL = "https://github.com/maximusmaximus/ripple/issues";

export function FeedbackFooter() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"feature" | "bug">("feature");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const send = async () => {
    if (body.trim().length < 8) {
      setMsg("A little more detail helps.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await submitStudioFeedback({ data: { kind, body: body.trim() } }).then((res) => {
        setBody("");
        setOpen(false);
        if (res.issue?.url) {
          setMsg(`Got it — opened as #${res.issue.number}.`);
        } else {
          setMsg("Got it — thank you.");
        }
      });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not send.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 pt-1">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setMsg(null);
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-fg/5 py-2.5 text-sm text-muted hover:bg-fg/10 hover:text-fg"
      >
        <Bug className="size-3.5" />
        Feature Request + Bug Submission
      </button>
      <a
        href={ISSUES_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-center text-[10px] text-subtle underline-offset-2 hover:text-muted hover:underline"
      >
        List lives on GitHub
      </a>
      {open && (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-fg/5 p-2">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setKind("feature")}
              className={
                "flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] " +
                (kind === "feature" ? "bg-fg/15 text-fg" : "text-muted hover:bg-fg/10")
              }
            >
              <Lightbulb className="size-3" />
              Feature
            </button>
            <button
              type="button"
              onClick={() => setKind("bug")}
              className={
                "flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] " +
                (kind === "bug" ? "bg-fg/15 text-fg" : "text-muted hover:bg-fg/10")
              }
            >
              <Bug className="size-3" />
              Bug
            </button>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder={kind === "bug" ? "What broke?" : "What should this do?"}
            className="min-h-20 w-full resize-none rounded-md border border-line bg-ink/60 px-2 py-1.5 text-[12px] text-fg outline-none placeholder:text-subtle"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void send()}
            className="rounded-md bg-fg/15 px-2.5 py-1.5 text-[11px] font-medium text-fg hover:bg-fg/25 disabled:opacity-40"
          >
            {busy ? "Sending…" : "Send"}
          </button>
        </div>
      )}
      {msg && (
        <p className="text-[10px] text-muted">
          {msg}{" "}
          <a
            href={ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-fg/80 underline-offset-2 hover:text-fg hover:underline"
          >
            View list
          </a>
        </p>
      )}
      <p className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-center text-[10px] leading-snug text-subtle">
        Made with
        <Heart className="inline size-3 fill-rose-400 text-rose-400" strokeWidth={0} aria-hidden />
        in SF with support from{" "}
        <a
          href="https://soundcloud.com/ridethevoid"
          target="_blank"
          rel="noopener noreferrer"
          className="voidride-mark"
        >
          VOIDRIDE
        </a>
      </p>
    </div>
  );
}
