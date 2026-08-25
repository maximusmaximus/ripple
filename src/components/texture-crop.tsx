import { TEXTURE_FITS, type TextureFit } from "@/lib/ripple/studio";

function fitClass(fit: TextureFit): string {
  if (fit === "contain") return "h-full w-full object-contain";
  if (fit === "stretch") return "h-full w-full object-fill";
  return "h-full w-full object-cover";
}

function CropFrame({
  src,
  fit,
  className,
}: {
  src: string;
  fit: TextureFit;
  className?: string;
}) {
  return (
    <div
      className={
        "relative overflow-hidden bg-ink " +
        (className ?? "aspect-[16/9] w-full rounded-md border border-line")
      }
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(45deg,#1a1a22_25%,transparent_25%,transparent_75%,#1a1a22_75%),linear-gradient(45deg,#1a1a22_25%,transparent_25%,transparent_75%,#1a1a22_75%)] bg-[length:12px_12px] bg-[position:0_0,6px_6px] opacity-60" />
      <img src={src} alt="" className={"relative z-[1] " + fitClass(fit)} />
    </div>
  );
}

export function TextureCrop({
  src,
  fit,
  onFit,
}: {
  src: string;
  fit: TextureFit;
  onFit: (fit: TextureFit) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <CropFrame src={src} fit={fit} />
      <div className="grid grid-cols-3 gap-1" role="group" aria-label="Crop">
        {TEXTURE_FITS.map((f) => {
          const on = fit === f.id;
          return (
            <button
              key={f.id}
              type="button"
              title={f.hint}
              onClick={() => onFit(f.id)}
              className={
                "flex flex-col gap-1 overflow-hidden rounded-md border p-1 text-left transition " +
                (on ? "border-fg/70 bg-fg/10" : "border-line/60 hover:border-fg/40")
              }
            >
              <CropFrame src={src} fit={f.id} className="aspect-[16/9] w-full rounded-[4px] border border-line/40" />
              <span className={"px-0.5 text-[10px] font-medium " + (on ? "text-fg" : "text-muted")}>
                {f.name}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] leading-snug text-subtle">
        {TEXTURE_FITS.find((f) => f.id === fit)?.hint}
      </p>
    </div>
  );
}
