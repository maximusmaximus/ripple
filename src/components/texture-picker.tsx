import { TEXTURE_ROWS, getTexture, type TextureId } from "@/lib/ripple/textures";
import { useRippleStore } from "@/store/ripple";

export function TexturePicker() {
  const textureId = useRippleStore((s) => s.textureId);
  const setTextureId = useRippleStore((s) => s.setTextureId);
  const active = getTexture(textureId);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-[11px] uppercase tracking-wider text-muted">
        <span>Texture</span>
        <span className="max-w-[70%] truncate text-right text-[11px] font-medium normal-case tracking-normal text-fg/80">
          {active.name}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        {TEXTURE_ROWS.map((row, i) => (
          <div key={i} className="grid grid-cols-6 gap-1" role="listbox" aria-label={i === 0 ? "Texture" : "Texture more"}>
            {row.map((t) => {
              const on = t.id === active.id;
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
                    (on
                      ? "border-fg ring-1 ring-fg/70"
                      : "border-line/60 hover:border-fg/40")
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
      </div>
      <p className="truncate text-[10px] leading-snug text-subtle">{active.hint}</p>
    </div>
  );
}
