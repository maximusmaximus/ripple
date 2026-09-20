import { useCallback, useEffect, useState } from "react";
import { TipCopy } from "./tip-mark";
import { readRecHd, writeRecHd, REC_HD_EVENT } from "@/lib/ripple/rec-hd";

function useRecHd(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(() => readRecHd());
  useEffect(() => {
    const sync = () => setOn(readRecHd());
    window.addEventListener(REC_HD_EVENT, sync);
    return () => window.removeEventListener(REC_HD_EVENT, sync);
  }, []);
  const set = useCallback((next: boolean) => {
    writeRecHd(next);
    setOn(next);
  }, []);
  return [on, set];
}

export function RecHdToggle() {
  const [on, setOn] = useRecHd();
  return (
    <div className="flex flex-col gap-1.5" data-rec-hd-toggle={on ? "1" : "0"}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-fg/90">HD record</p>
          <p className="text-[11px] leading-snug text-muted">Native pixels. Highest quality this screen can take.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="HD record"
          data-rec-hd={on ? "on" : "off"}
          onClick={() => setOn(!on)}
          className={
            "flex h-7 w-11 shrink-0 items-center rounded-full border p-0.5 transition " +
            (on ? "border-fg/70 bg-fg/25" : "border-line bg-fg/8")
          }
        >
          <span
            className={
              "size-5 rounded-full bg-fg shadow-sm transition-transform " + (on ? "translate-x-4" : "translate-x-0")
            }
          />
        </button>
      </div>
      <TipCopy>
        {on
          ? "Every take is HD until you turn this off."
          : "Turn on to save every take at this screen’s native size."}
      </TipCopy>
    </div>
  );
}
