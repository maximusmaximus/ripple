import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  applyEmoji,
  expandShortcodes,
  lookupEmoji,
  suggestEmoji,
  tokenAt,
  type EmojiHit,
  type ShortcodeToken,
} from "@/lib/ripple/emoji";

type Props = {
  value: string;
  onChange: (next: string) => void;
  maxLength: number;
  placeholder?: string;
  disabled?: boolean;
  onSubmit?: () => void;
};

export function EmojiNameField({ value, onChange, maxLength, placeholder, disabled, onSubmit }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [token, setToken] = useState<ShortcodeToken | null>(null);
  const [hits, setHits] = useState<EmojiHit[]>([]);
  const [active, setActive] = useState(0);
  const [box, setBox] = useState<{ left: number; top: number; width: number; flip: boolean } | null>(null);

  const place = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const flip = r.bottom + 220 > window.innerHeight;
    setBox({
      left: Math.max(8, Math.min(r.left, window.innerWidth - Math.max(180, r.width) - 8)),
      top: flip ? r.top - 6 : r.bottom + 6,
      width: r.width,
      flip,
    });
  };

  useLayoutEffect(() => {
    if (!token) {
      setBox(null);
      return;
    }
    place();
  }, [token, value]);

  useEffect(() => {
    if (!token) return;
    const onWin = () => place();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [token]);

  const commit = (hit: EmojiHit) => {
    const t = token ?? tokenAt(value, inputRef.current?.selectionStart ?? value.length);
    if (!t) return;
    const { next, caret } = applyEmoji(value, t, hit.glyph);
    const clipped = next.slice(0, maxLength);
    onChange(clipped);
    setToken(null);
    setHits([]);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const pos = Math.min(caret, clipped.length);
      el.setSelectionRange(pos, pos);
    });
  };

  const scan = (text: string, caret: number) => {
    const t = tokenAt(text, caret);
    if (!t) {
      setToken(null);
      setHits([]);
      return;
    }
    const nextHits = suggestEmoji(t.query);
    setToken(t);
    setHits(nextHits);
    setActive(0);
  };

  const menu =
    hits.length > 0 && box
      ? createPortal(
          <div
            id="emoji-suggest-list"
            data-emoji-suggest
            role="listbox"
            className="emoji-suggest"
            style={{
              left: box.left,
              width: Math.max(180, box.width),
              ...(box.flip ? { bottom: window.innerHeight - box.top } : { top: box.top }),
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {hits.map((hit, i) => (
              <button
                key={hit.code}
                type="button"
                role="option"
                aria-selected={i === active}
                className={"emoji-suggest-row" + (i === active ? " is-active" : "")}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(hit)}
              >
                <span className="emoji-suggest-glyph">{hit.glyph}</span>
                <span className="emoji-suggest-code">:{hit.code}:</span>
              </button>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative min-w-0 flex-1">
      <input
        ref={inputRef}
        value={value}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-expanded={hits.length > 0}
        aria-controls="emoji-suggest-list"
        className="w-full rounded-md border border-line bg-ink/60 px-2 py-1.5 text-[12px] text-fg outline-none placeholder:text-subtle"
        onChange={(e) => {
          const raw = e.target.value;
          const caret = e.target.selectionStart ?? raw.length;
          const expanded = expandShortcodes(raw);
          if (expanded !== raw) {
            const clipped = expanded.slice(0, maxLength);
            onChange(clipped);
            setToken(null);
            setHits([]);
            const delta = expanded.length - raw.length;
            requestAnimationFrame(() => {
              const el = inputRef.current;
              if (!el) return;
              const pos = Math.max(0, Math.min(clipped.length, caret + delta));
              el.setSelectionRange(pos, pos);
            });
            return;
          }
          const clipped = raw.slice(0, maxLength);
          onChange(clipped);
          scan(clipped, Math.min(caret, clipped.length));
        }}
        onSelect={(e) => {
          const el = e.currentTarget;
          scan(el.value, el.selectionStart ?? el.value.length);
        }}
        onKeyDown={(e) => {
          if (hits.length > 0 && token) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => (i + 1) % hits.length);
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => (i - 1 + hits.length) % hits.length);
              return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
              const hit = hits[active];
              if (hit) {
                e.preventDefault();
                commit(hit);
                return;
              }
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setToken(null);
              setHits([]);
              return;
            }
          }
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit?.();
          }
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setToken(null);
            setHits([]);
          }, 120);
        }}
      />
      {menu}
    </div>
  );
}
