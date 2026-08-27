import type { ReactNode } from "react";
import {
  Blend,
  BookmarkPlus,
  Camera,
  Compass,
  Droplets,
  Eraser,
  Grid2x2,
  Info,
  Layers,
  Lightbulb,
  MessageSquarePlus,
  Mic,
  Paintbrush,
  Palette,
  Radio,
  RotateCw,
  Smartphone,
  Sparkles,
  Spline,
  Sun,
  Trash2,
  Waves,
  ZoomIn,
} from "lucide-react";

const ICONS: Record<string, typeof Paintbrush> = {
  paint: Paintbrush,
  presets: Grid2x2,
  save: BookmarkPlus,
  delete: Trash2,
  brushes: Paintbrush,
  diameter: Spline,
  shadow: Sun,
  "brush-shape": RotateCw,
  layerfx: Blend,
  texture: Layers,
  gradient: Palette,
  viscosity: Droplets,
  wave: Waves,
  "cam-interact": Camera,
  "mic-sens": Mic,
  "gyro-sens": Compass,
  "gyro-zoom": ZoomIn,
  clear: Eraser,
  clean: Sparkles,
  pair: Smartphone,
  live: Radio,
  camera: Camera,
  mic: Mic,
  gyro: Compass,
  feedback: MessageSquarePlus,
  rec: Lightbulb,
};

function ArtFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2 flex h-14 items-center justify-center overflow-hidden rounded-xl border border-line/80 bg-fg/5">
      {children}
    </div>
  );
}

function GradientArt() {
  return (
    <ArtFrame>
      <svg viewBox="0 0 160 32" className="h-8 w-[85%]" aria-hidden>
        <defs>
          <linearGradient id="ga" x1="0" x2="1">
            <stop offset="0%" stopColor="#07141f" />
            <stop offset="40%" stopColor="#1a4a5c" />
            <stop offset="75%" stopColor="#7ec8d8" />
            <stop offset="100%" stopColor="#d7f6ff" />
          </linearGradient>
        </defs>
        <path d="M4 16 L 40 6 L 80 4 L 120 10 L 156 22 L 156 26 L 120 22 L 80 20 L 40 22 L 4 20 Z" fill="url(#ga)" />
        <rect x="10" y="20" width="5" height="5" transform="rotate(45 12.5 22.5)" fill="#07141f" stroke="#fff" strokeWidth="0.8" />
        <rect x="58" y="18" width="4" height="4" transform="rotate(45 60 20)" fill="#1a4a5c" stroke="#fff" strokeWidth="0.7" />
        <rect x="98" y="18" width="4" height="4" transform="rotate(45 100 20)" fill="#7ec8d8" stroke="#fff" strokeWidth="0.7" />
        <rect x="138" y="22" width="4" height="4" transform="rotate(45 140 24)" fill="#d7f6ff" stroke="#fff" strokeWidth="0.7" />
      </svg>
    </ArtFrame>
  );
}

function WidthArt() {
  return (
    <ArtFrame>
      <svg viewBox="0 0 160 32" className="h-8 w-[85%] text-fg/70" aria-hidden>
        <path d="M4 16 L 40 6 L 80 4 L 120 10 L 156 22 L 156 26 L 120 22 L 80 20 L 40 22 L 4 20 Z" fill="currentColor" />
      </svg>
    </ArtFrame>
  );
}

function PairArt() {
  return (
    <ArtFrame>
      <div className="flex items-center gap-3 text-fg/80">
        <span className="grid grid-cols-3 gap-0.5">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className={"size-1.5 " + (i % 2 ? "bg-fg" : "bg-fg/40")} />
          ))}
        </span>
        <Smartphone className="size-5" />
      </div>
    </ArtFrame>
  );
}

function RecArt() {
  return (
    <ArtFrame>
      <span className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-red-300">
        <span className="size-2.5 rounded-full bg-red-500" />
        REC 0:30
      </span>
    </ArtFrame>
  );
}

function ShadowArt() {
  return (
    <ArtFrame>
      <div className="relative h-8 w-20">
        <span className="absolute left-7 top-1 size-6 rounded-full bg-fg/25" />
        <span className="absolute left-3 top-3 size-6 rounded-full bg-fg/80" />
      </div>
    </ArtFrame>
  );
}

function TextureArt() {
  return (
    <ArtFrame>
      <div className="grid grid-cols-4 gap-1 px-3">
        {["#d8cbb8", "#5a3a58", "#c4b090", "#3a3a3e"].map((c) => (
          <span key={c} className="h-7 w-7 rounded-md border border-white/20" style={{ background: c }} />
        ))}
      </div>
    </ArtFrame>
  );
}

function PresetArt() {
  return (
    <ArtFrame>
      <div className="grid grid-cols-4 gap-1 px-3">
        {["#7ec8d8", "#d7f6ff", "#1a4a5c", "#07141f"].map((c) => (
          <span key={c} className="h-7 w-7 rounded-md border border-white/20" style={{ background: c }} />
        ))}
      </div>
    </ArtFrame>
  );
}

export function GuideArt({ id }: { id: string }) {
  if (id === "gradient") return <GradientArt />;
  if (id === "diameter") return <WidthArt />;
  if (id === "shadow") return <ShadowArt />;
  if (id === "texture") return <TextureArt />;
  if (id === "pair") return <PairArt />;
  if (id === "rec") return <RecArt />;
  if (id === "presets" || id === "save" || id === "delete") return <PresetArt />;
  const Icon = ICONS[id] ?? Info;
  return (
    <ArtFrame>
      <Icon className="size-6 text-fg/75" strokeWidth={1.6} />
    </ArtFrame>
  );
}
