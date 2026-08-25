import { useEffect, useState } from "react";
import { BookmarkPlus } from "lucide-react";
import { useRippleStore } from "@/store/ripple";
import {
  EASY_PRESET_ID,
  easyPreset,
  loadHomebasePresets,
  newPresetId,
  sanitizePresetName,
  type NamedPreset,
} from "@/lib/ripple/studio";
import { listStudioPresets, saveStudioPreset } from "@/lib/ripple/studio-api";

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

export function PresetStrip() {
  const applySnapshot = useRippleStore((s) => s.applySnapshot);
  const takeSnapshot = useRippleStore((s) => s.takeSnapshot);
  const [presets, setPresets] = useState<NamedPreset[]>([easyPreset()]);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(EASY_PRESET_ID);

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

  const save = async () => {
    const n = sanitizePresetName(name);
    if (!n) {
      setMsg("Name the preset first.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const preset: NamedPreset = {
        id: newPresetId(),
        name: n,
        createdAt: new Date().toISOString(),
        snapshot: takeSnapshot(),
        source: "studio",
      };
      await saveStudioPreset({ data: { id: preset.id, name: preset.name, snapshot: preset.snapshot } });
      setName("");
      setOpen(false);
      setActiveId(preset.id);
      setMsg("Saved. Everyone in this studio can load it.");
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

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
            Saving makes this mix global — anyone who opens the studio can use it. It will not be deleted by Clean
            Session.
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
      <div className="flex gap-1 overflow-x-auto pb-0.5" role="list" aria-label="Presets">
        {presets.map((p) => {
          const on = activeId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              title={p.id === EASY_PRESET_ID ? "Starter mix — simple ink on a clear bed" : p.name}
              onClick={() => {
                applySnapshot(p.snapshot);
                setActiveId(p.id);
              }}
              className={
                "shrink-0 rounded-full border px-2.5 py-1 text-[10px] " +
                (on
                  ? "border-fg/70 bg-fg/15 text-fg"
                  : "border-line bg-fg/8 text-fg/85 hover:border-fg/40 hover:bg-fg/15")
              }
            >
              {p.name}
            </button>
          );
        })}
      </div>
      {msg && <p className="text-[10px] text-muted">{msg}</p>}
    </section>
  );
}
