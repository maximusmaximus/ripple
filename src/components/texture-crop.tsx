import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { TEXTURE_FITS, type TextureFit } from "@/lib/ripple/studio";
import { TipCopy } from "./tip-mark";

function fitClass(fit: TextureFit): string {
  if (fit === "contain") return "h-full w-full object-contain";
  if (fit === "stretch") return "h-full w-full object-fill";
  return "h-full w-full object-cover";
}

function levelsFilter(amt: number): string {
  const a = Math.max(0, Math.min(1, amt));
  if (a < 0.008) return "none";
  const contrast = 1 + a * 4.2;
  const gray = a > 0.62 ? ((a - 0.62) / 0.38) * 100 : 0;
  return `contrast(${contrast}) grayscale(${gray}%)`;
}

function CropFrame({
  src,
  fit,
  levels = 0,
  className,
  children,
}: {
  src: string;
  fit: TextureFit;
  levels?: number;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={
        "relative overflow-hidden bg-ink " +
        (className ?? "aspect-[16/9] w-full rounded-md border border-line")
      }
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(45deg,#1a1a22_25%,transparent_25%,transparent_75%,#1a1a22_75%),linear-gradient(45deg,#1a1a22_25%,transparent_25%,transparent_75%,#1a1a22_75%)] bg-[length:12px_12px] bg-[position:0_0,6px_6px] opacity-60"
        aria-hidden
      />
      <img
        src={src}
        alt=""
        className={"relative z-[1] " + fitClass(fit)}
        style={{ filter: levelsFilter(levels) }}
        draggable={false}
      />
      {children}
    </div>
  );
}

export function TextureCrop({
  src,
  fit,
  onFit,
  levels,
  onLevels,
  onReset,
}: {
  src: string;
  fit: TextureFit;
  onFit: (fit: TextureFit) => void;
  levels: number;
  onLevels: (v: number) => void;
  onReset: () => void;
}) {
  const others = TEXTURE_FITS.filter((f) => f.id !== fit);
  const active = TEXTURE_FITS.find((f) => f.id === fit) ?? TEXTURE_FITS[0]!;

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="overflow-hidden rounded-md border border-fg/70 bg-fg/10 p-1 ring-1 ring-fg/40"
        role="group"
        aria-label={`${active.name} crop`}
      >
        <div className="relative">
          <CropFrame
            src={src}
            fit={fit}
            levels={levels}
            className="aspect-[16/9] w-full rounded-[4px] border border-line/40"
          >
            <button
              type="button"
              title="Reset this image to the original photo. Brush, color, and sensors stay."
              aria-label="Reset image"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onReset();
              }}
              className="absolute left-1/2 top-1/2 z-[3] flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink/80 text-fg shadow-lg ring-1 ring-fg/60 backdrop-blur-sm hover:bg-ink hover:ring-fg"
            >
              <RefreshCw className="size-4" strokeWidth={2.4} />
            </button>
            <div className="absolute inset-x-0 bottom-0 z-[2] flex flex-col gap-1 bg-gradient-to-t from-ink/95 via-ink/70 to-transparent px-2.5 pb-2 pt-8">
              <div className="flex justify-between text-[11px] text-fg/90">
                <span>Threshold</span>
                <span className="font-mono tabular-nums">{Math.round(levels * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={levels}
                aria-label="Image threshold"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onLevels(parseFloat(e.target.value))}
                className="w-full"
                suppressHydrationWarning
              />
            </div>
          </CropFrame>
        </div>
        <p className="px-0.5 pt-1 text-[10px] font-medium text-fg">{active.name}</p>
      </div>

      <div className="grid grid-cols-2 gap-1" role="radiogroup" aria-label="Other crops">
        {others.map((f) => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={false}
            title={f.hint}
            onClick={() => onFit(f.id)}
            className="flex flex-col gap-1 overflow-hidden rounded-md border border-line/60 p-1 text-left transition hover:border-fg/40"
          >
            <CropFrame
              src={src}
              fit={f.id}
              levels={0}
              className="aspect-[16/9] w-full rounded-[4px] border border-line/40"
            />
            <span className="px-0.5 text-[10px] font-medium text-muted">{f.name}</span>
          </button>
        ))}
      </div>
      <TipCopy>
        {active.hint} Refresh restores the original photo — not the rest of the mix.
      </TipCopy>
    </div>
  );
}
