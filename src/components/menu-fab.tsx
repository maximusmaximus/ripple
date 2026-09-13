import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { TipMark } from "./tip-mark";
import { markMenuSeen, menuSeenBefore } from "@/lib/ripple/session-resume";
import { clampFloatPos, FLOAT_FAB_SIZE, type DockPoint } from "@/lib/ripple/float-dock";

export function MenuFab({
  onOpen,
  anchor = null,
}: {
  onOpen: () => void;
  anchor?: DockPoint | null;
}) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setPulse(!menuSeenBefore());
  }, []);

  const placed = Boolean(anchor);
  const point = anchor
    ? typeof window === "undefined"
      ? anchor
      : clampFloatPos(anchor, {
          vw: window.innerWidth,
          vh: window.innerHeight,
          width: FLOAT_FAB_SIZE,
          height: FLOAT_FAB_SIZE,
        })
    : null;

  return (
    <div
      className={
        placed
          ? "pointer-events-none absolute z-40"
          : "pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center studio-lift"
      }
      style={point ? { left: point.x, top: point.y } : undefined}
      data-menu-fab-anchor={placed ? "float" : "dock"}
    >
      <button
        type="button"
        data-ui-chrome
        data-menu-fab="true"
        data-menu-pulse={pulse ? "1" : "0"}
        className="menu-fab pointer-events-auto"
        onClick={() => {
          if (pulse) {
            markMenuSeen();
            setPulse(false);
          }
          onOpen();
        }}
        aria-label="Show menu"
      >
        {pulse ? (
          <>
            <span className="menu-fab-ring" aria-hidden />
            <span className="menu-fab-ring menu-fab-ring-delay" aria-hidden />
          </>
        ) : null}
        <Menu className="size-7" strokeWidth={2} />
        <TipMark id="menu" />
      </button>
    </div>
  );
}
