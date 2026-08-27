import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { TEXTURES, getTexture, type TextureId } from "@/lib/ripple/textures";
import { MAX_UPLOAD_BYTES, mediaSrc } from "@/lib/ripple/studio";
import { readTextureFile } from "@/lib/ripple/texture-file";
import { useRippleStore } from "@/store/ripple";
import { TextureCrop } from "./texture-crop";
import { TipMark, TipCopy } from "./tip-mark";

const SWIPE_LOCK_PX = 10;
const SWIPE_COMMIT_PX = 40;

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
  const nameRef = useRef<HTMLParagraphElement>(null);
  const swipe = useRef({
    pointer: -1,
    x: 0,
    y: 0,
    lock: null as null | "x" | "y",
    dx: 0,
  });

  const previewSrc = customLiveUrl || mediaSrc(customTexture);
  const items = customTexture ? [...STARTERS, getTexture("custom")] : STARTERS;
  const active = getTexture(textureId === "custom" && !customTexture ? "none" : textureId);
  const activeIndex = Math.max(0, items.findIndex((t) => t.id === active.id));

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
    const el = wellRef.current?.querySelector(`[data-tex-id="${active.id}"]`);
    if (el instanceof HTMLElement) el.scrollIntoView({ block: "nearest" });
  }, [active.id]);

  const step = (dir: -1 | 1) => {
    if (items.length < 2) return;
    const next = items[(activeIndex + dir + items.length) % items.length]!;
    setTextureId(next.id);
  };

  const onSwipeDown = (e: ReactPointerEvent) => {
    swipe.current = { pointer: e.pointerId, x: e.clientX, y: e.clientY, lock: null, dx: 0 };
  };
  const onSwipeMove = (e: ReactPointerEvent) => {
    if (swipe.current.pointer !== e.pointerId) return;
    const dx = e.clientX - swipe.current.x;
    const dy = e.clientY - swipe.current.y;
    if (!swipe.current.lock) {
      if (Math.abs(dx) < SWIPE_LOCK_PX && Math.abs(dy) < SWIPE_LOCK_PX) return;
      swipe.current.lock = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
    }
    if (swipe.current.lock !== "x") return;
    e.preventDefault();
    swipe.current.dx = dx;
    if (nameRef.current) nameRef.current.style.transform = `translateX(${dx * 0.35}px)`;
  };
  const onSwipeUp = (e: ReactPointerEvent) => {
    if (swipe.current.pointer !== e.pointerId) return;
    const dx = swipe.current.dx;
    swipe.current.pointer = -1;
    if (nameRef.current) nameRef.current.style.transform = "";
    if (swipe.current.lock === "x" && Math.abs(dx) >= SWIPE_COMMIT_PX) step(dx < 0 ? 1 : -1);
    swipe.current.lock = null;
    swipe.current.dx = 0;
  };

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

  const barFor = (id: TextureId) => {
    if (id === "custom" && previewSrc) return `url(${previewSrc}) center / cover`;
    return getTexture(id).preview;
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="touch-pan-x select-none overflow-hidden rounded-xl border border-fg/35 bg-fg/8"
        role="group"
        tabIndex={0}
        aria-label={`${active.name}. Swipe left or right to change texture.`}
        onPointerDown={onSwipeDown}
        onPointerMove={onSwipeMove}
        onPointerUp={onSwipeUp}
        onPointerCancel={onSwipeUp}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            step(-1);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            step(1);
          }
        }}
      >
        <div
          className="h-3 w-full"
          style={{ background: barFor(active.id), backgroundSize: "cover" }}
          aria-hidden
        />
        <div className="flex items-center gap-0.5 px-0.5">
          <button
            type="button"
            aria-label="Previous texture"
            disabled={items.length < 2}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => step(-1)}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-fg/70 hover:bg-fg/12 hover:text-fg disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p
            ref={nameRef}
            className="min-w-0 flex-1 truncate py-1.5 text-center text-[12px] font-medium text-fg will-change-transform"
          >
            {active.name}
          </p>
          <span className="inline-flex shrink-0 items-center">
            <TipMark id="texture" />
          </span>
          <button
            type="button"
            aria-label="Next texture"
            disabled={items.length < 2}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => step(1)}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-fg/70 hover:bg-fg/12 hover:text-fg disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

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
          className="preset-well-scroll grid h-[7.5rem] grid-cols-4 content-start gap-1 overflow-y-auto p-1.5 pr-6"
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
