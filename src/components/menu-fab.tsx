import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { TipMark } from "./tip-mark";
import { markMenuSeen, menuSeenBefore } from "@/lib/ripple/session-resume";

export function MenuFab({ onOpen }: { onOpen: () => void }) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setPulse(!menuSeenBefore());
  }, []);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center studio-lift">
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
