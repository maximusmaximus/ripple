import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BookmarkPlus, X } from "lucide-react";
import { useRippleStore } from "@/store/ripple";
import {
  EASY_PRESET_ID,
  MAX_PRESET_NAME,
  easyPreset,
  hydrateSnapshotMedia,
  loadHomebasePresets,
  newPresetId,
  sanitizePresetName,
  uniquePresetName,
  type NamedPreset,
} from "@/lib/ripple/studio";
import { snapshotBarCss } from "@/lib/ripple/palettes";
import { isBuiltinPresetId, builtinPresets } from "@/lib/ripple/showroom";
import { deleteStudioPreset, listStudioPresets, putStudioSession, saveStudioPreset } from "@/lib/ripple/studio-api";
import { TipMark, TipCopy } from "./tip-mark";
import { EmojiNameField } from "./emoji-suggest";

const HOLD_MS = 2000;

function mergePresets(home: NamedPreset[], studio: NamedPreset[]): NamedPreset[] {
  const seen = new Set<string>();
  const out: NamedPreset[] = [];
  for (const p of [...home, ...studio]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  if (!out.some((p) => p.id === EASY_PRESET_ID)) out.push(easyPreset());
  out.sort((a, b) => {
    if (a.id === EASY_PRESET_ID) return -1;
    if (b.id === EASY_PRESET_ID) return 1;
    const t = a.createdAt.localeCompare(b.createdAt);
    if (t !== 0) return t;
    return a.name.localeCompare(b.name);
  });
  return out;
}

function sameLabel(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function barFor(p: NamedPreset): string {
  return snapshotBarCss(p.snapshot.worldId, p.snapshot.colorStops, Boolean(p.snapshot.gradientFlip));
}

export function PresetStrip() {
  const applySnapshot = useRippleStore((s) => s.applySnapshot);
  const takeSnapshot = useRippleStore((s) => s.takeSnapshot);
  const worldName = useRippleStore((s) => s.getActivePalette().name);
  const hiddenIds = useRippleStore((s) => s.hiddenPresetIds);
  const hidePreset = useRippleStore((s) => s.hidePreset);
  const [presets, setPresets] = useState<NamedPreset[]>(() => builtinPresets());
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "info" | "error" } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(EASY_PRESET_ID);
  const [armedId, setArmedId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [upHint, setUpHint] = useState(0);
  const [downHint, setDownHint] = useState(0);
  const holdTimer = useRef<number | null>(null);
  const held = useRef(false);
  const wellRef = useRef<HTMLDivElement>(null);
  const pinBottom = useRef(false);

  const formRef = useRef<HTMLDivElement>(null);

  const visible = presets.filter((p) => !hiddenIds.includes(p.id));

  const syncHints = () => {
    const el = wellRef.current;
    if (!el) return;
    const fromTop = el.scrollTop;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinBottom.current = fromBottom < 12;
    setUpHint(Math.max(0, Math.min(1, fromTop / 40)));
    setDownHint(Math.max(0, Math.min(1, fromBottom / 40)));
  };

  const pinToBottom = () => {
    const el = wellRef.current;
    if (!el || !pinBottom.current) return;
    el.scrollTop = el.scrollHeight;
    syncHints();
  };

  const refresh = async () => {
    try {
      const [home, studio] = await Promise.all([loadHomebasePresets(), listStudioPresets()]);
      setPresets(mergePresets(home, studio));
    } catch {
      const home = await loadHomebasePresets();
      setPresets(mergePresets(home, []));
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useLayoutEffect(() => {
    const el = wellRef.current;
    if (!el) return;
    if (pinBottom.current) pinToBottom();
    else el.scrollTop = 0;
    syncHints();
    const ro = new ResizeObserver(() => {
      if (pinBottom.current) pinToBottom();
      syncHints();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [visible.length]);

  const clearHold = () => {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const revealChip = (id: string) => {
    requestAnimationFrame(() => {
      const well = wellRef.current;
      const chip = well?.querySelector(`[data-preset-id="${CSS.escape(id)}"]`);
      if (!well || !(chip instanceof HTMLElement)) return;
      const c = chip.getBoundingClientRect();
      const w = well.getBoundingClientRect();
      if (c.top < w.top) well.scrollTop -= w.top - c.top;
      else if (c.bottom > w.bottom) well.scrollTop += c.bottom - w.bottom;
    });
  };

  const load = async (p: NamedPreset) => {
    const snap = await hydrateSnapshotMedia(p.snapshot);
    applySnapshot(snap);
    setActiveId(p.id);
    revealChip(p.id);
  };

  const beginSave = () => {
    const next = uniquePresetName(`${worldName} mix`, visible.map((p) => p.name));
    setName(next);
    setOpen(true);
    setMsg({ text: "Save as a new preset. Existing names stay as they are.", tone: "info" });
  };

  useLayoutEffect(() => {
    if (!open) return;
    const dock = document.querySelector(".controls-dock-scroll");
    if (dock instanceof HTMLElement) dock.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const input = formRef.current?.querySelector("input");
    input?.focus({ preventScroll: true });
  }, [open]);

  const save = async () => {
    const n = sanitizePresetName(name);
    if (!n) {
      setMsg({ text: "Name the new preset first.", tone: "error" });
      return;
    }
    if (visible.some((p) => sameLabel(p.name, n)) || presets.some((p) => sameLabel(p.name, n))) {
      setMsg({ text: "That name is taken — pick another. Save as never overwrites.", tone: "error" });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const snapshot = takeSnapshot();
      const preset: NamedPreset = {
        id: newPresetId(),
        name: n,
        createdAt: new Date().toISOString(),
        snapshot,
        source: "studio",
      };
      await putStudioSession({ data: snapshot }).catch(() => {});
      await saveStudioPreset({ data: { id: preset.id, name: preset.name, snapshot: preset.snapshot } });
      setName("");
      setOpen(false);
      setActiveId(preset.id);
      pinBottom.current = true;
      setMsg({ text: "Saved as a new preset. The live surface stays as it is.", tone: "info" });
      await refresh();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Could not save.", tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      if (!isBuiltinPresetId(id)) {
        await deleteStudioPreset({ data: { id } });
      }
      hidePreset(id);
      setConfirmId(null);
      setArmedId(null);
      const next = visible.find((p) => p.id !== id) ?? easyPreset();
      setActiveId(next.id);
      applySnapshot(next.snapshot);
      revealChip(next.id);
      setMsg({
        text: isBuiltinPresetId(id) ? "Starter preset hidden on this studio." : "Preset removed.",
        tone: "info",
      });
      await refresh();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Could not delete.", tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const jumpInWell = (clientY: number, target: HTMLElement) => {
    const el = wellRef.current;
    if (!el) return;
    const rect = target.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (clientY - rect.top) / Math.max(1, rect.height)));
    pinBottom.current = t > 0.92;
    el.scrollTo({ top: t * (el.scrollHeight - el.clientHeight), behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-1.5">
      {open && (
        <div ref={formRef} className="flex flex-col gap-1.5 rounded-xl border border-line bg-fg/5 p-2">
          <TipCopy className="text-[10px] leading-snug text-amber-200/90">
            Save as a new preset. Type :fire: for emoji — it pops up as you type. Names cannot match an existing preset.
          </TipCopy>
          <div className="flex gap-1.5">
            <EmojiNameField
              value={name}
              onChange={setName}
              maxLength={MAX_PRESET_NAME}
              placeholder="New preset name"
              disabled={busy}
              onSubmit={() => void save()}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="rounded-md bg-fg/15 px-2.5 py-1.5 text-[11px] font-medium text-fg hover:bg-fg/25 disabled:opacity-40"
            >
              Save as
            </button>
          </div>
        </div>
      )}
      <div className="preset-well relative overflow-hidden rounded-2xl border border-line/80">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-12 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300"
          style={{ opacity: upHint }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-14 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300"
          style={{ opacity: downHint }}
        />
        <div
          ref={wellRef}
          className="preset-well-scroll chip-well-scroll grid grid-cols-4 content-start gap-1 overflow-y-auto p-1.5 pr-6"
          role="list"
          aria-label="Presets"
          onScroll={syncHints}
          onWheel={(e) => e.stopPropagation()}
        >
          {visible.map((p) => {
            const on = activeId === p.id;
            const armed = armedId === p.id;
            return (
              <div key={p.id} data-preset-id={p.id} className="relative min-w-0">
                <button
                  type="button"
                  title={
                    p.id === EASY_PRESET_ID
                      ? "Starter mix — hold to remove"
                      : `${p.name} — hold to remove`
                  }
                  onPointerDown={() => {
                    held.current = false;
                    clearHold();
                    holdTimer.current = window.setTimeout(() => {
                      held.current = true;
                      setArmedId(p.id);
                    }, HOLD_MS);
                  }}
                  onPointerUp={clearHold}
                  onPointerCancel={clearHold}
                  onPointerLeave={clearHold}
                  onClick={() => {
                    if (held.current) {
                      held.current = false;
                      return;
                    }
                    void load(p);
                  }}
                  className={
                    "flex min-h-11 w-full flex-col overflow-hidden rounded-lg border text-left text-[10px] leading-tight " +
                    (on
                      ? "border-fg bg-fg/18 text-fg"
                      : armed
                        ? "border-fg/50 bg-fg/12 text-fg"
                        : "border-line/80 bg-fg/8 text-fg/85 hover:border-fg/40 hover:bg-fg/15")
                  }
                >
                  <span
                    className={on ? "block h-7 w-full" : "block h-6 w-full"}
                    style={{ background: barFor(p) }}
                    aria-hidden="true"
                  />
                  <span className={"min-h-0 flex-1 truncate px-1.5 " + (on ? "py-1.5 font-medium" : "py-1")}>{p.name}</span>
                </button>
                {armed && (
                  <button
                    type="button"
                    aria-label={`Delete ${p.name}`}
                    onClick={() => setConfirmId(p.id)}
                    className="absolute -right-1 -top-1 z-10 flex size-4 items-center justify-center rounded-full bg-fg text-ink"
                  >
                    <X className="size-2.5" strokeWidth={3} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="dock-scroll-track absolute inset-y-1.5 right-1 z-[2] w-4 rounded-md"
          aria-label="Scroll presets"
          onClick={(e) => jumpInWell(e.clientY, e.currentTarget)}
        />
        <button
          type="button"
          onClick={() => {
            if (open) {
              setOpen(false);
              setMsg(null);
            } else {
              beginSave();
            }
          }}
          className="absolute bottom-1.5 right-6 z-[3] inline-flex items-center gap-1 rounded-full border border-line bg-ink/90 px-2.5 py-1.5 text-[10px] font-medium text-fg shadow-lg backdrop-blur-md hover:bg-ink hover:text-fg"
        >
          <BookmarkPlus className="size-3" />
          Save as
          <TipMark id="save" />
        </button>
      </div>
      {confirmId && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-fg/8 px-2 py-1.5">
          <p className="text-[10px] text-fg/90">
            {isBuiltinPresetId(confirmId) ? "Hide this starter preset?" : "Delete this preset for everyone?"}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                setConfirmId(null);
                setArmedId(null);
              }}
              className="rounded-md px-2 py-1 text-[10px] text-muted hover:text-fg"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove(confirmId)}
              className="rounded-md bg-fg/15 px-2 py-1 text-[10px] font-medium text-fg hover:bg-fg/25"
            >
              Remove
            </button>
          </div>
        </div>
      )}
      {msg?.tone === "error" && <p className="text-[10px] text-amber-200/90">{msg.text}</p>}
      {msg?.tone === "info" && <TipCopy>{msg.text}</TipCopy>}
    </div>
  );
}
