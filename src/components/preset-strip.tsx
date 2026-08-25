import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BookmarkPlus, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useRippleStore } from "@/store/ripple";
import {
  EASY_PRESET_ID,
  easyPreset,
  loadHomebasePresets,
  newPresetId,
  sanitizePresetName,
  type NamedPreset,
} from "@/lib/ripple/studio";
import { deleteStudioPreset, listStudioPresets, putStudioSession, saveStudioPreset } from "@/lib/ripple/studio-api";

function mergePresets(home: NamedPreset[], studio: NamedPreset[]): NamedPreset[] {
  const seen = new Set<string>();
  const merged: NamedPreset[] = [];
  for (const p of [easyPreset(), ...studio, ...home]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push(p);
  }
  const easy = merged.find((p) => p.id === EASY_PRESET_ID);
  const rest = merged.filter((p) => p.id !== EASY_PRESET_ID);
  return easy ? [easy, ...rest] : [easyPreset(), ...rest];
}

function sameLabel(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function PresetStrip() {
  const applySnapshot = useRippleStore((s) => s.applySnapshot);
  const takeSnapshot = useRippleStore((s) => s.takeSnapshot);
  const [presets, setPresets] = useState<NamedPreset[]>([easyPreset()]);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(EASY_PRESET_ID);
  const [canDelete, setCanDelete] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [overflow, setOverflow] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    setCanDelete(false);
    setConfirmId(null);
    if (!activeId || activeId === EASY_PRESET_ID) return;
    const t = window.setTimeout(() => setCanDelete(true), 2000);
    return () => window.clearTimeout(t);
  }, [activeId]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => setOverflow(el.scrollHeight > el.clientHeight + 4 || el.scrollWidth > el.clientWidth + 4);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [presets]);

  const page = (dir: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ top: dir * (el.clientHeight - 4), behavior: "smooth" });
  };

  const save = async () => {
    const n = sanitizePresetName(name);
    if (!n) {
      setMsg("Name the preset first.");
      return;
    }
    if (presets.some((p) => sameLabel(p.name, n))) {
      setMsg("That label is already in use — pick another.");
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
      setMsg("Saved. Mix stays as it is — everyone in this studio can load it.");
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (id === EASY_PRESET_ID) return;
    setBusy(true);
    try {
      await deleteStudioPreset({ data: { id } });
      setConfirmId(null);
      setCanDelete(false);
      setActiveId(EASY_PRESET_ID);
      applySnapshot(easyPreset().snapshot);
      setMsg("Preset removed.");
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not delete.");
    } finally {
      setBusy(false);
    }
  };

  const active = presets.find((p) => p.id === activeId);
  const allowDelete = canDelete && active && active.id !== EASY_PRESET_ID;

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-subtle">Presets</h3>
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setMsg(null);
          }}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-fg/80 hover:text-fg"
        >
          <BookmarkPlus className="size-3" />
          Save mix
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-line bg-fg/5 p-2">
          <p className="text-[10px] leading-snug text-amber-200/90">
            Each label can only be used once. Saving makes this mix global. The live session stays as it is.
          </p>
          <div className="flex gap-1.5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              placeholder="Name this mix"
              className="min-w-0 flex-1 rounded-md border border-line bg-ink/60 px-2 py-1.5 text-[12px] text-fg outline-none placeholder:text-subtle"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="rounded-md bg-fg/15 px-2.5 py-1.5 text-[11px] font-medium text-fg hover:bg-fg/25 disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      )}
      <div className="flex items-stretch gap-1">
        {overflow && (
          <button
            type="button"
            onClick={() => page(-1)}
            className="flex w-7 shrink-0 items-center justify-center rounded-md border border-line bg-fg/8 text-fg/80 hover:bg-fg/15"
            aria-label="Previous presets"
          >
            <ChevronLeft className="size-3.5" />
          </button>
        )}
        <div
          ref={scroller}
          className="flex max-h-[3.4rem] min-w-0 flex-1 flex-wrap content-start gap-1 overflow-y-auto"
          role="list"
          aria-label="Presets"
        >
          {presets.map((p) => {
            const on = activeId === p.id;
            return (
              <div key={p.id} className="relative shrink-0">
                <button
                  type="button"
                  title={p.id === EASY_PRESET_ID ? "Starter mix — simple ink on a clear bed" : p.name}
                  onClick={() => {
                    applySnapshot(p.snapshot);
                    setActiveId(p.id);
                  }}
                  className={
                    "rounded-full border px-2.5 py-1 text-[10px] " +
                    (on
                      ? "border-fg/70 bg-fg/15 text-fg"
                      : "border-line bg-fg/8 text-fg/85 hover:border-fg/40 hover:bg-fg/15")
                  }
                >
                  {p.name}
                </button>
                {on && allowDelete && (
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
        {overflow && (
          <button
            type="button"
            onClick={() => page(1)}
            className="flex w-7 shrink-0 items-center justify-center rounded-md border border-line bg-fg/8 text-fg/80 hover:bg-fg/15"
            aria-label="More presets"
          >
            <ChevronRight className="size-3.5" />
          </button>
        )}
      </div>
      {confirmId && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-fg/8 px-2 py-1.5">
          <p className="text-[10px] text-fg/90">Delete this mix for everyone?</p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setConfirmId(null)}
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
              Delete
            </button>
          </div>
        </div>
      )}
      {msg && <p className="text-[10px] text-muted">{msg}</p>}
    </section>
  );
}
