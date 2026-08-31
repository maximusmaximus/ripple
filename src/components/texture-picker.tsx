import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { TEXTURES, getTexture } from "@/lib/ripple/textures";
import {
  MAX_UPLOAD_BYTES,
  hasMediaPayload,
  mediaSrc,
  uniqueSurfaceName,
} from "@/lib/ripple/studio";
import { readTextureFile } from "@/lib/ripple/texture-file";
import { makeRandomSurface } from "@/lib/ripple/random-surface";
import { useRippleStore } from "@/store/ripple";
import { TextureCrop } from "./texture-crop";
import { TipCopy } from "./tip-mark";

const STARTERS = TEXTURES.filter((t) => t.id !== "custom");
const HOLD_MS = 2000;

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
  const customSurfaces = useRippleStore((s) => s.customSurfaces);
  const customLiveUrl = useRippleStore((s) => s.customLiveUrl);
  const addCustomSurface = useRippleStore((s) => s.addCustomSurface);
  const selectCustomSurface = useRippleStore((s) => s.selectCustomSurface);
  const removeCustomSurface = useRippleStore((s) => s.removeCustomSurface);
  const fileRef = useRef<HTMLInputElement>(null);
  const holdTimer = useRef<number | null>(null);
  const held = useRef(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<"off" | "file" | "random">("off");
  const [upHint, setUpHint] = useState(0);
  const [downHint, setDownHint] = useState(0);
  const [armedId, setArmedId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const wellRef = useRef<HTMLDivElement>(null);

  const library = customSurfaces.filter(hasMediaPayload);
  const previewSrc = customLiveUrl || mediaSrc(customTexture);
  const activeCustomId = textureId === "custom" ? customTexture?.id ?? null : null;
  const activeStarter = getTexture(textureId === "custom" && !customTexture ? "none" : textureId);
  const activeName =
    textureId === "custom" ? customTexture?.name || (customTexture?.kind === "upload" ? "Upload" : "Random") : activeStarter.name;

  const clearHold = () => {
    if (holdTimer.current != null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

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
  }, [library.length]);

  useEffect(() => {
    const well = wellRef.current;
    const key = activeCustomId ? `cs:${activeCustomId}` : activeStarter.id;
    const el = well?.querySelector(`[data-tex-id="${key}"]`);
    if (!well || !(el instanceof HTMLElement)) return;
    const c = el.getBoundingClientRect();
    const w = well.getBoundingClientRect();
    if (c.top < w.top) well.scrollTop -= w.top - c.top;
    else if (c.bottom > w.bottom) well.scrollTop += c.bottom - w.bottom;
  }, [activeCustomId, activeStarter.id]);

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
    setBusy("file");
    setErr(null);
    try {
      const loaded = await readTextureFile(file);
      const taken = useRippleStore.getState().customSurfaces.map((s) => s.name || "");
      const name = uniqueSurfaceName(file.name.replace(/\.[^.]+$/, "") || "Upload", taken);
      addCustomSurface(
        { ...loaded.still, name, kind: "upload" },
        loaded.animated ? loaded.liveUrl : null,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not use that file.");
    } finally {
      setBusy("off");
    }
  };

  const onRandom = () => {
    if (busy !== "off") return;
    setBusy("random");
    setErr(null);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        try {
          const state = useRippleStore.getState();
          const taken = state.customSurfaces.map((s) => s.name || "");
          const tex = makeRandomSurface(state.getActiveColors(), taken);
          state.addCustomSurface(tex);
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Could not paint a surface.");
        } finally {
          setBusy("off");
        }
      });
    });
  };

  const fab =
    "inline-flex items-center gap-1 rounded-full border border-line bg-ink/90 px-2.5 py-1.5 text-[10px] font-medium text-fg shadow-lg backdrop-blur-md hover:bg-ink hover:text-fg disabled:opacity-40";

  const chipClass = (on: boolean, armed: boolean) =>
    "flex min-h-11 w-full flex-col overflow-hidden rounded-lg border text-left text-[10px] leading-tight " +
    (on
      ? "border-fg bg-fg/18 text-fg"
      : armed
        ? "border-fg/50 bg-fg/12 text-fg"
        : "border-line/80 bg-fg/8 text-fg/85 hover:border-fg/40 hover:bg-fg/15");

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
          className="preset-well-scroll chip-well-scroll grid grid-cols-4 content-start gap-1 overflow-y-auto p-1.5"
          role="list"
          aria-label="Textures"
          onWheel={(e) => e.stopPropagation()}
        >
          {STARTERS.map((t) => {
            const on = textureId !== "custom" && t.id === activeStarter.id;
            return (
              <div key={t.id} data-tex-id={t.id} className="relative min-w-0">
                <button
                  type="button"
                  title={`${t.name} — ${t.hint}`}
                  onClick={() => setTextureId(t.id)}
                  className={chipClass(on, false)}
                >
                  <span className={on ? "block h-7 w-full" : "block h-6 w-full"} style={{ background: t.preview }} aria-hidden />
                  <span className={"min-h-0 flex-1 truncate px-1.5 " + (on ? "py-1.5 font-medium" : "py-1")}>{t.name}</span>
                </button>
              </div>
            );
          })}
          {library.map((s) => {
            const id = s.id || "";
            const on = textureId === "custom" && activeCustomId === id;
            const armed = armedId === id;
            const src = mediaSrc(s);
            const label = s.name || (s.kind === "upload" ? "Upload" : "Random");
            return (
              <div
                key={id}
                data-tex-id={`cs:${id}`}
                data-custom-surface={s.kind || "random"}
                data-surface-name={label}
                data-armed={armed ? "1" : "0"}
                className="relative min-w-0"
                onPointerDown={(e) => {
                  if (!id) return;
                  e.stopPropagation();
                  const node = e.currentTarget;
                  node.setAttribute("data-holding", "1");
                  held.current = false;
                  clearHold();
                  holdTimer.current = window.setTimeout(() => {
                    held.current = true;
                    setArmedId(id);
                  }, HOLD_MS);
                }}
                onPointerUp={(e) => {
                  e.currentTarget.removeAttribute("data-holding");
                  clearHold();
                }}
              >
                <button
                  type="button"
                  title={`${label} — hold to remove`}
                  onClick={() => {
                    if (held.current) {
                      held.current = false;
                      return;
                    }
                    if (id) selectCustomSurface(id);
                  }}
                  className={chipClass(on, armed)}
                >
                  <span
                    className={on ? "block h-7 w-full" : "block h-6 w-full"}
                    style={src ? { background: `url("${src}") center / cover no-repeat` } : undefined}
                    aria-hidden
                  />
                  <span className={"min-h-0 flex-1 truncate px-1.5 " + (on ? "py-1.5 font-medium" : "py-1")}>{label}</span>
                </button>
                {armed && (
                  <button
                    type="button"
                    aria-label={`Delete ${label}`}
                    onClick={() => setConfirmId(id)}
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
          className="dock-scroll-track well-scroll-track absolute inset-y-1.5 right-1 z-[2] w-4 rounded-md"
          aria-label="Scroll textures"
          onClick={(e) => jumpInWell(e.clientY, e.currentTarget)}
        />
        <div className="well-fab-cluster">
          <button
            type="button"
            title="Upload a JPG, PNG, GIF, or WebP — max 10 MB. Adds a chip you can hold to remove."
            onClick={() => fileRef.current?.click()}
            disabled={busy !== "off"}
            className={fab}
          >
            <Plus className="size-3" strokeWidth={2.4} />
            Upload
          </button>
          <button
            type="button"
            data-random-surface="true"
            title="Paint a unique grain. Each tap is a different recipe and adds a chip — Save as keeps the live one with the mix."
            onClick={onRandom}
            disabled={busy !== "off"}
            className={fab}
          >
            <Plus className="size-3" strokeWidth={2.4} />
            {busy === "random" ? "Painting…" : "Random"}
          </button>
        </div>
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

      {confirmId && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-fg/8 px-2 py-1.5">
          <p className="text-[10px] text-fg/90">Delete this surface?</p>
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
              onClick={() => {
                removeCustomSurface(confirmId);
                setConfirmId(null);
                setArmedId(null);
              }}
              className="rounded-md bg-fg/15 px-2 py-1 text-[10px] font-medium text-fg hover:bg-fg/25"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {err ? (
        <p className="text-[10px] text-amber-200/90">{err}</p>
      ) : busy === "file" ? (
        <p className="text-[10px] text-subtle">Reading image…</p>
      ) : busy === "random" ? (
        <p className="text-[10px] text-subtle">Painting a surface…</p>
      ) : (
        <TipCopy>
          {textureId === "custom"
            ? `${activeName} rides the fluid. Crop, threshold, or hold two seconds to remove. Save as stores it with the mix.`
            : activeStarter.hint}
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
