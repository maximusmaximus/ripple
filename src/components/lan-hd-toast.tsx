import { useEffect, useRef, useState } from "react";
import { Lightbulb } from "lucide-react";

/** One-shot notice when phone and wall are on the same network. */
export function LanHdToast({ on }: { on: boolean }) {
  const [visible, setVisible] = useState(false);
  const seen = useRef(false);

  useEffect(() => {
    if (!on || seen.current) return;
    seen.current = true;
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 4800);
    return () => window.clearTimeout(t);
  }, [on]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[4.5rem] z-50 flex justify-center px-3 pt-[env(safe-area-inset-top)]">
      <p
        data-lan-hd-toast="true"
        className="flex max-w-sm items-center gap-2 rounded-full border border-ripple/50 bg-ink/80 px-3 py-2 text-[12px] text-fg/90 shadow-lg backdrop-blur-md"
      >
        <Lightbulb className="size-3.5 fill-ripple text-ripple" strokeWidth={1.5} />
        Same network — the wall will save HD
      </p>
    </div>
  );
}