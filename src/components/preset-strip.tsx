import { useEffect, useState } from "react";
import { BookmarkPlus } from "lucide-react";
import { useRippleStore } from "@/store/ripple";
import {
  loadHomebasePresets,
  newPresetId,
  sanitizePresetName,
  type NamedPreset,
} from "@/lib/ripple/studio";
import { listStudioPresets, saveStudioPreset } from "@/lib/ripple/studio-api";

export function PresetStrip() {
  const applySnapshot = useRippleStore((s) => s.applySnapshot);
  const takeSnapshot = useRippleStore((s) => s.takeSnapshot);
  const [presets, setPresets] = useState<NamedPreset[]>([]);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const [home, studio] = await Promise.all([loadHomebasePresets(), listStudioPresets()]);
      const seen = new Set<string>();
      const merged: NamedPreset[] = [];
      for (const p of [...studio, ...home]) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        merged.push(p);
      }
      setPresets(merged);
    } catch {
      const home = await loadHomebasePresets();
      setPresets(home);
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
      setMsg("Saved for everyone in this studio.");
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-[11px] uppercase tracking-wider text-muted">
        <span>Saved</span>
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setMsg(null);
          }}
          className="inline-flex items-center gap-1 text-[10px] font-medium normal-case tracking-normal text-fg/80 hover:text-fg"
        >
          <BookmarkPlus className="size-3" />
          Save mix
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-line bg-fg/5 p-2">
          <p className="text-[10px] leading-snug text-amber-200/90">
            This preset is global — anyone using the studio can load it.
          </p>
          <div className="flex gap-1.5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              placeholder="Name"
              className="min-w-0 flex-1 rounded-md border border-line bg-ink/60 px-2 py-1 text-[12px] text-fg outline-none placeholder:text-subtle"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="rounded-md bg-fg/15 px-2.5 py-1 text-[11px] font-medium text-fg hover:bg-fg/25 disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      )}
      {presets.length > 0 ? (
        <div className="flex gap-1 overflow-x-auto pb-0.5" role="list">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.name}
              onClick={() => applySnapshot(p.snapshot)}
              className="shrink-0 rounded-full border border-line bg-fg/8 px-2 py-0.5 text-[10px] text-fg/85 hover:border-fg/40 hover:bg-fg/15"
            >
              {p.name}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-subtle">No saved mixes yet.</p>
      )}
      {msg && <p className="text-[10px] text-muted">{msg}</p>}
    </div>
  );
}
