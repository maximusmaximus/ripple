import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { TEXTURES, getTexture } from "@/lib/ripple/textures";
import { MAX_UPLOAD_BYTES, mediaSrc } from "@/lib/ripple/studio";
import { readTextureFile } from "@/lib/ripple/texture-file";
import { useRippleStore } from "@/store/ripple";
import { TextureCrop } from "./texture-crop";
import { TipCopy } from "./tip-mark";

const STARTERS = TEXTURES.filter((t) => t.id !== "custom");

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [upHint, setUpHint] = useState(0);
  const [downHint, setDownHint] = useState(0);
  const wellRef = useRef<HTMLDivElement>(null);

  const previewSrc = customLiveUrl || mediaSrc(customTexture);
  const items = customTexture ? [...STARTERS, getTexture("custom")] : STARTERS;
  const active = getTexture(textureId === "custom" && !customTexture ? "none" : textureId);

  const syncHints = () => {
    const el = wellRef.current;
    if (!el) return;
    const fromTop = el.scrollTop;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setUpHint(Math.max(0, Math.min(1, fromTop / 40)));
    setDownHint(Math.max(0, Math.min(1, fromBottom / 40)));
  };

  useLayoutEffect(() => {
    syncHints();
    const el = wellRef.current;
    if (!el) return;
    const onScroll = () => syncHints();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [items.length]);

  useEffect(() => {
    const well = wellRef.current;
    const el = well?.querySelector(`[data-tex-id="${active.id}"]`);
    if (!well || !(el instanceof HTMLElement)) return;
    const c = el.getBoundingClientRect();
    const w = well.getBoundingClientRect();
    if (c.top < w.top) well.scrollTop -= w.top - c.top;
    else if (c.bottom > w.bottom) well.scrollTop += c.bottom - w.bottom;
  }, [active.id]);

  const jumpInWell = (clientY: number, target: HTMLElement) => {
    const el = wellRef.current;
    if (!el) return;
    const rect = target.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (clientY - rect.top) / Math.max(1, rect.height)));
    el.scrollTo({ top: t * (el.scrollHeight - el.clientHeight), behavior: "smooth" });
  };

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
          aria-label="Textures"
          onWheel={(e) => e.stopPropagation()}
        >
          {items.map((t) => {
            const on = t.id === active.id;
            const preview = t.id === "custom" && previewSrc ? `url(${previewSrc}) center / cover` : t.preview;
            return (
              <div key={t.id} data-tex-id={t.id} className="relative min-w-0">
                <button
                  type="button"
                  title={`${t.name} — ${t.hint}`}
                  onClick={() => setTextureId(t.id)}
                  className={
                    "flex min-h-11 w-full flex-col overflow-hidden rounded-lg border text-left text-[10px] leading-tight " +
                    (on
                      ? "border-fg bg-fg/18 text-fg"
                      : "border-line/80 bg-fg/8 text-fg/85 hover:border-fg/40 hover:bg-fg/15")
                  }
                >
                  <span
                    className={on ? "block h-7 w-full" : "block h-6 w-full"}
                    style={{ background: preview, backgroundSize: "cover" }}
                    aria-hidden
                  />
                  <span className={"min-h-0 flex-1 truncate px-1.5 " + (on ? "py-1.5 font-medium" : "py-1")}>
                    {t.name}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="dock-scroll-track absolute inset-y-1.5 right-1 z-[2] w-4 rounded-md"
          aria-label="Scroll textures"
          onClick={(e) => jumpInWell(e.clientY, e.currentTarget)}
        />
        <button
          type="button"
          title={
            customTexture
              ? "Your upload — tap to replace (JPG, PNG, GIF · max 10 MB)"
              : "Upload a JPG, PNG, GIF, or WebP — max 10 MB"
          }
          onClick={() => {
            if (customTexture && textureId !== "custom") {
              setTextureId("custom");
              return;
            }
            fileRef.current?.click();
          }}
          disabled={busy}
          className="absolute bottom-1.5 right-6 z-[3] inline-flex items-center gap-1 rounded-full border border-line bg-ink/90 px-2.5 py-1.5 text-[10px] font-medium text-fg shadow-lg backdrop-blur-md hover:bg-ink hover:text-fg"
        >
          <Plus className="size-3" strokeWidth={2.4} />
          Upload
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
          className="hidden"
          suppressHydrationWarning
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            void onFile(f);
          }}
        />
      </div>

      {err ? (
        <p className="text-[10px] text-amber-200/90">{err}</p>
      ) : busy ? (
        <p className="text-[10px] text-subtle">Reading image…</p>
      ) : (
        <TipCopy>
          {textureId === "custom"
            ? "Your image rides the fluid. Crop, threshold, or refresh it below."
            : active.hint}
        </TipCopy>
      )}

      <div className="flex items-center justify-between gap-2 rounded-lg px-0.5 py-1 text-[12px] text-muted">
        <span className={textureId === "none" ? "text-fg/40" : "text-fg/90"}>Invert color</span>
        <button
          type="button"
          role="switch"
          aria-checked={textureInvert}
          disabled={textureId === "none"}
          onClick={() => setTextureInvert(!textureInvert)}
          className={
            "flex h-7 w-11 shrink-0 items-center rounded-full border p-0.5 transition disabled:opacity-30 " +
            (textureInvert ? "border-fg/70 bg-fg/25" : "border-line bg-fg/8")
          }
        >
          <span
            className={
              "size-5 rounded-full bg-fg shadow-sm transition-transform " +
              (textureInvert ? "translate-x-4" : "translate-x-0")
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
