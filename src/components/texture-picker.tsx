import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { TEXTURE_ROWS, getTexture, type TextureId } from "@/lib/ripple/textures";
import { TEXTURE_FITS } from "@/lib/ripple/studio";
import { readTextureFile } from "@/lib/ripple/texture-file";
import { useRippleStore } from "@/store/ripple";

export function TexturePicker() {
  const textureId = useRippleStore((s) => s.textureId);
  const setTextureId = useRippleStore((s) => s.setTextureId);
  const textureFit = useRippleStore((s) => s.textureFit);
  const setTextureFit = useRippleStore((s) => s.setTextureFit);
  const customTexture = useRippleStore((s) => s.customTexture);
  const setCustomTexture = useRippleStore((s) => s.setCustomTexture);
  const active = getTexture(textureId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const loaded = await readTextureFile(file);
      setCustomTexture(loaded.still, loaded.animated ? loaded.liveUrl : null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not use that file.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-[11px] uppercase tracking-wider text-muted">
        <span>Texture</span>
        <span className="max-w-[70%] truncate text-right text-[11px] font-medium normal-case tracking-normal text-fg/80">
          {textureId === "custom" ? "Upload" : active.name}
        </span>
      </div>
      <div className="relative flex flex-col gap-1">
        {TEXTURE_ROWS.map((row, i) => (
          <div key={i} className="grid grid-cols-6 gap-1" role="listbox" aria-label={i === 0 ? "Texture" : "Texture more"}>
            {row.map((t) => {
              const on = t.id === active.id && textureId !== "custom";
              return (
                <button
                  key={t.id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  title={`${t.name} — ${t.hint}`}
                  onClick={() => setTextureId(t.id as TextureId)}
                  className={
                    "relative aspect-square overflow-hidden rounded-md border transition " +
                    (on ? "border-fg ring-1 ring-fg/70" : "border-line/60 hover:border-fg/40")
                  }
                >
                  <span
                    className="absolute inset-0"
                    style={{ background: t.preview, backgroundSize: "cover" }}
                    aria-hidden
                  />
                  {t.id === "none" && (
                    <span className="absolute inset-[30%] rounded-[1px] bg-fg/25" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        ))}
        <button
          type="button"
          title="Upload a JPG, PNG, or GIF — max 10 MB, 4K"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className={
            "absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center overflow-hidden rounded-md border border-fg/40 bg-ink/80 text-fg shadow-lg backdrop-blur-sm transition hover:bg-ink " +
            (textureId === "custom" ? "ring-1 ring-fg" : "")
          }
        >
          {customTexture ? (
            <span
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${customTexture.dataUrl})` }}
              aria-hidden
            />
          ) : null}
          <Plus className="relative size-4 drop-shadow" strokeWidth={2.25} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            void onFile(f);
          }}
        />
      </div>
      <p className="truncate text-[10px] leading-snug text-subtle">
        {err ?? (textureId === "custom" ? "Your image rides the fluid. Pick how it crops." : active.hint)}
      </p>
      {textureId === "custom" && customTexture && (
        <div className="grid grid-cols-3 gap-1" role="group" aria-label="Crop">
          {TEXTURE_FITS.map((f) => {
            const on = textureFit === f.id;
            return (
              <button
                key={f.id}
                type="button"
                title={f.hint}
                onClick={() => setTextureFit(f.id)}
                className={
                  "rounded-md border px-1 py-1 text-[10px] font-medium " +
                  (on ? "border-fg/70 bg-fg/15 text-fg" : "border-line/60 text-muted hover:border-fg/40")
                }
              >
                {f.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
