import type { ReactNode } from "react";
import { GUIDE_BY_ID } from "@/lib/ripple/guides";
import { useRippleStore } from "@/store/ripple";

export function TipMark({ id, className = "" }: { id: string; className?: string }) {
  const on = useRippleStore((s) => s.tipsOn);
  const openId = useRippleStore((s) => s.openTipId);
  const setOpenTip = useRippleStore((s) => s.setOpenTip);
  const tip = GUIDE_BY_ID[id];
  if (!on || !tip) return null;
  const active = openId === id;
  return (
    <button
      type="button"
      data-tip={id}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOpenTip(active ? null : id);
      }}
      className={
        "tip-i inline-flex size-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-semibold leading-none " +
        (active
          ? "border-fg/80 bg-fg text-ink"
          : "border-fg/45 bg-ink/70 text-fg/85 hover:border-fg/70 hover:text-fg") +
        (className ? ` ${className}` : "")
      }
      aria-label={`About ${tip.title}`}
      aria-pressed={active}
    >
      i
    </button>
  );
}

/** Helper copy that only takes vertical space while tips are on. */
export function TipCopy({ children, className }: { children: ReactNode; className?: string }) {
  const on = useRippleStore((s) => s.tipsOn);
  if (!on) return null;
  return <p className={className ?? "text-[10px] leading-snug text-subtle"}>{children}</p>;
}
