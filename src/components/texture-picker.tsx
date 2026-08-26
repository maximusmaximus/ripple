import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { TEXTURE_ROWS, getTexture, type TextureId } from "@/lib/ripple/textures";
import { MAX_UPLOAD_BYTES, mediaSrc } from "@/lib/ripple/studio";
import { readTextureFile } from "@/lib/ripple/texture-file";
import { useRippleStore } from "@/store/ripple";
import { TextureCrop } from "./texture-crop";
import { TipMark } from "./tip-mark";

export function TexturePicker() {
  const textureId = useRippleStore((s) => s.textureId);
  const setTextureId = useRippleStore((s) => s.setTextureId);
  const textureFit = useRippleStore((s) => s.textureFit);
  const setTextureFit = useRippleStore((s) => s.setTextureFit);
  const textureLevels = useRippleStore((s) => s.textureLevels);
  const setTextureLevels = useRippleStore((s) => s.setTextureLevels);
  const textureInvert = useRippleStore((s) => s.textureInvert);
  const setTextureInvert = useRippleStore((s) => s.setTextureInvert);
  const resetCustomImage = useRippleStore((s) => s.resetCustomImage);
  const customTexture = useRippleStore((s) => s.customTexture);
  const customLiveUrl = useRippleStore((s) => s.customLiveUrl);
  const setCustomTexture = useRippleStore((s) => s.setCustomTexture);
  const active = getTexture(textureId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const previewSrc = customLiveUrl || mediaSrc(customTexture);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setErr("Max 10 MB — try a smaller file.");
      return;
    }
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
        <span className="inline-flex items-center gap-1">
          Texture
          <TipMark id="texture" />
        </span>
        <span className="max-w-[70%] truncate text-right text-[11px] font-medium normal-case tracking-normal text-fg/80">
          {textureId === "custom" ? "Upload" : active.name}
        </span>
      </div>
      <div className="relative flex flex-col gap-1 pb-3 pr-3">
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
        <div className="absolute bottom-0 right-0 z-10">
          <button
            type="button"
            title={customTexture ? "Your upload — tap to replace (JPG, PNG, GIF · max 10 MB, 4K)" : "Upload a JPG, PNG, or GIF — max 10 MB, 4K"}
            onClick={() => {
              if (customTexture && textureId !== "custom") {
                setTextureId("custom");
                return;
              }
              fileRef.current?.click();
            }}
            disabled={busy}
            className={
              "relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border bg-ink/90 text-fg shadow-lg backdrop-blur-sm transition hover:bg-ink " +
              (textureId === "custom" ? "border-fg ring-1 ring-fg" : "border-fg/50")
            }
          >
            {previewSrc ? (
              <span
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${previewSrc})` }}
                aria-hidden
              />
            ) : null}
            <span className="absolute inset-0 bg-ink/35" aria-hidden />
            <Plus className="relative size-4 drop-shadow" strokeWidth={2.4} />
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            void onFile(f);
          }}
        />
      </div>
      <p className="truncate pr-8 text-[10px] leading-snug text-subtle">
        {err ??
          (busy
            ? "Reading image…"
            : textureId === "custom"
              ? "Your image rides the fluid. Crop, threshold, or refresh it below."
              : active.hint)}
      </p>
      <div className="flex items-center justify-between gap-2 rounded-lg px-0.5 py-1 text-[12px] text-muted">
        <span className={textureId === "none" ? "text-fg/40" : "text-fg/90"}>Invert color</span>
        <button
          type="button"
          role="switch"
          aria-checked={textureInvert}
          disabled={textureId === "none"}
          onClick={() => setTextureInvert(!textureInvert)}
          className={
            "relative h-7 w-12 shrink-0 rounded-full border transition disabled:opacity-30 " +
            (textureInvert ? "border-fg/70 bg-fg/25" : "border-line bg-fg/8")
          }
        >
          <span
            className={
              "absolute top-0.5 size-5 rounded-full bg-fg transition-transform " +
              (textureInvert ? "translate-x-6" : "translate-x-0.5")
            }
          />
        </button>
      </div>
      {textureId === "custom" && previewSrc && (
        <TextureCrop
          src={previewSrc}
          fit={textureFit}
          onFit={setTextureFit}
          levels={textureLevels}
          onLevels={setTextureLevels}
          onReset={resetCustomImage}
        />
      )}
    </div>
  );
}
