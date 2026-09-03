import { Pin } from "lucide-react";
import { PIN_META, type PinId } from "@/lib/ripple/pins";
import { useRippleStore } from "@/store/ripple";
import { TipMark } from "./tip-mark";

export function DockPin({ id, showTip = false }: { id: PinId; showTip?: boolean }) {
  const pinned = useRippleStore((s) => s.pinnedSliders.includes(id));
  const pinSlider = useRippleStore((s) => s.pinSlider);
  const meta = PIN_META[id];
  return (
    <span className="relative shrink-0">
      <button
        type="button"
        data-dock-pin={id}
        data-pinned={pinned ? "1" : "0"}
        aria-pressed={pinned}
        aria-label={pinned ? `Unpin ${meta.label}` : `Pin ${meta.label} to canvas`}
        title={pinned ? "Unpin from canvas" : "Pin to canvas"}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          pinSlider(id);
        }}
        className={
          "flex size-9 items-center justify-center rounded-full border transition " +
          (pinned
            ? "border-fg/70 bg-fg/20 text-fg"
            : "border-line bg-fg/5 text-subtle hover:border-fg/40 hover:text-fg")
        }
      >
        <Pin className={"size-3.5 " + (pinned ? "fill-current" : "")} strokeWidth={1.75} />
      </button>
      {showTip ? <TipMark id="pin" className="pointer-events-auto absolute -right-0.5 -top-0.5 z-20" /> : null}
    </span>
  );
}
