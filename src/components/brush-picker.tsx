import { BRUSHES, type BrushId } from "@/lib/ripple/brushes";
import { useRippleStore } from "@/store/ripple";

/** Compact horizontal brush strip with size/weight previews. */
export function BrushPicker() {
  const brushId = useRippleStore((s) => s.brushId);
  const setBrushId = useRippleStore((s) => s.setBrushId);
  const active = (brushId as BrushId) || "ink";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-[12px] text-muted">
        <span>Brush</span>
        <span className="text-[11px] font-medium text-fg/80">
          {BRUSHES.find((b) => b.id === active)?.name ?? "Ink"}
        </span>
      </div>
      <div
        className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="listbox"
        aria-label="Brush presets"
      >
        {BRUSHES.map((b) => {
          const selected = b.id === active;
          // Preview scale relative to wash (largest)
          const sizePct = 28 + (b.radius / 0.068) * 52;
          const opacity = 0.25 + b.force * 0.65;
          const soft = b.kind === "soft";
          const spray = b.kind === "scatter";

          return (
            <button
              key={b.id}
              type="button"
              role="option"
              aria-selected={selected}
              title={b.name}
              onClick={() => setBrushId(b.id)}
              className={
                "flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border transition " +
                (selected
                  ? "border-fg/45 bg-fg/15 text-fg"
                  : "border-line bg-ink/40 text-muted hover:border-fg/25 hover:bg-fg/8 hover:text-fg")
              }
            >
              <span className="relative flex h-6 w-6 items-center justify-center">
                {spray ? (
                  <>
                    {[0, 1, 2, 3, 4].map((i) => {
                      const ang = (i / 5) * Math.PI * 2;
                      const r = 3.2;
                      return (
                        <span
                          key={i}
                          className="absolute rounded-full bg-current"
                          style={{
                            width: 3.5,
                            height: 3.5,
                            opacity: opacity * 0.9,
                            transform: `translate(${Math.cos(ang) * r}px, ${Math.sin(ang) * r}px)`,
                          }}
                        />
                      );
                    })}
                    <span
                      className="rounded-full bg-current"
                      style={{ width: 4, height: 4, opacity }}
                    />
                  </>
                ) : (
                  <span
                    className="rounded-full bg-current"
                    style={{
                      width: `${sizePct}%`,
                      height: `${sizePct}%`,
                      opacity,
                      filter: soft ? "blur(0.6px)" : undefined,
                      boxShadow: soft ? "0 0 4px currentColor" : undefined,
                    }}
                  />
                )}
              </span>
              <span className="mt-0.5 max-w-full truncate px-0.5 text-[8px] font-medium leading-none tracking-wide">
                {b.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
