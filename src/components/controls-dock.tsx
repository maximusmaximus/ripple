import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Smartphone } from "lucide-react";
import { ColorRangeSlider } from "./color-range-slider";
import { TexturePicker } from "./texture-picker";
import { BrushPicker } from "./brush-picker";
import { BrushSpanSlider } from "./brush-span-slider";
import { BrushShadowPanel } from "./brush-shadow";
import { LayerFxPicker } from "./brush-fx";
import { PresetStrip } from "./preset-strip";
import { FeedbackFooter } from "./feedback-form";
import { StudioCredit } from "./studio-credit";
import { TipMark, TipCopy } from "./tip-mark";
import { SessionShare, type SessionShareValue } from "./session-share";
import { useRippleStore } from "@/store/ripple";

function DockSection({
  id,
  focus,
  onFocus,
  children,
}: {
  id: string;
  focus: string | null;
  onFocus: (id: string) => void;
  children: ReactNode;
}) {
  const hot = focus === id;
  const dim = focus != null && !hot;
  return (
    <section
      data-dock-section={id}
      data-dock-hot={hot ? "1" : "0"}
      className={"dock-section flex flex-col gap-2.5 " + (hot ? "is-hot" : dim ? "is-dim" : "")}
      onPointerDown={() => {
        if (hot) return;
        onFocus(id);
      }}
    >
      {children}
    </section>
  );
}

export function ControlsDock({
  onShowPair,
  showPairButton = false,
  sessionShare,
}: {
  onShowPair?: () => void;
  showPairButton?: boolean;
  sessionShare?: {
    code: string;
    value: SessionShareValue;
    onChange: (next: SessionShareValue) => void;
    occupied?: boolean;
  };
}) {
  const viscosity = useRippleStore((s) => s.viscosity);
  const waveStrength = useRippleStore((s) => s.waveStrength);
  const cameraInteract = useRippleStore((s) => s.cameraInteract);
  const micSensitivity = useRippleStore((s) => s.micSensitivity);
  const gyroSensitivity = useRippleStore((s) => s.gyroSensitivity);
  const gyroZoom = useRippleStore((s) => s.gyroZoom);
  const setViscosity = useRippleStore((s) => s.setViscosity);
  const setWaveStrength = useRippleStore((s) => s.setWaveStrength);
  const setCameraInteract = useRippleStore((s) => s.setCameraInteract);
  const setMicSensitivity = useRippleStore((s) => s.setMicSensitivity);
  const setGyroSensitivity = useRippleStore((s) => s.setGyroSensitivity);
  const setGyroZoom = useRippleStore((s) => s.setGyroZoom);
  const clearSurface = useRippleStore((s) => s.clearSurface);
  const cleanSession = useRippleStore((s) => s.cleanSession);
  const dockOpen = useRippleStore((s) => s.dockOpen);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState<string | null>(null);

  const setSectionFocus = (id: string) => {
    setFocus(id || null);
  };

  useEffect(() => {
    if (!dockOpen) {
      setFocus(null);
      return;
    }
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
    el.querySelectorAll(".chip-well-scroll").forEach((n) => {
      if (n instanceof HTMLElement) n.scrollTop = 0;
    });
  }, [dockOpen]);

  useEffect(() => {
    if (!focus) return;
    const el = scrollRef.current?.querySelector(`[data-dock-section="${CSS.escape(focus)}"]`);
    if (el instanceof HTMLElement) el.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [focus]);

  const page = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ top: dir * Math.max(140, el.clientHeight * 0.72), behavior: "smooth" });
  };

  const jumpTo = (clientY: number, target: HTMLElement) => {
    const el = scrollRef.current;
    if (!el) return;
    const rect = target.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (clientY - rect.top) / Math.max(1, rect.height)));
    el.scrollTo({ top: t * (el.scrollHeight - el.clientHeight), behavior: "smooth" });
  };

  return (
    <div
      className="controls-dock relative flex w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-line bg-ink/85 shadow-2xl backdrop-blur-xl"
      data-dock-focus={focus ?? "none"}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="controls-dock-scroll absolute inset-0 overflow-y-auto overscroll-contain"
          onPointerDown={(e) => {
            if (!(e.target instanceof Element)) return;
            if (!e.target.closest("[data-dock-section]")) setFocus(null);
          }}
        >
          <div className="flex flex-col gap-3 px-4 pb-4 pr-9 pt-4">
          <DockSection id="presets" focus={focus} onFocus={setSectionFocus}>
            <h3 className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-subtle">
              Presets
              <TipMark id="presets" />
              <TipMark id="delete" />
            </h3>
            <PresetStrip />
          </DockSection>

          <DockSection id="surface" focus={focus} onFocus={setSectionFocus}>
            <h3 className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-subtle">
              Surface
              <TipMark id="texture" />
            </h3>
            <TexturePicker />
            <ColorRangeSlider />
            <label className="flex flex-col gap-2">
              <div className="flex justify-between text-[12px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  Viscosity
                  <TipMark id="viscosity" />
                </span>
                <span className="font-mono tabular-nums text-fg">{viscosity.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.85}
                max={0.999}
                step={0.001}
                value={viscosity}
                onChange={(e) => setViscosity(parseFloat(e.target.value))}
                className="w-full"
                suppressHydrationWarning
              />
            </label>
            <label className="flex flex-col gap-2">
              <div className="flex justify-between text-[12px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  Wave strength
                  <TipMark id="wave" />
                </span>
                <span className="font-mono tabular-nums text-fg">{waveStrength.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.5}
                step={0.01}
                value={waveStrength}
                onChange={(e) => setWaveStrength(parseFloat(e.target.value))}
                className="w-full"
                suppressHydrationWarning
              />
            </label>
          </DockSection>

          <DockSection id="paint" focus={focus} onFocus={setSectionFocus}>
            <h3 className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-subtle">
              Paint
              <TipMark id="paint" />
            </h3>
            <BrushPicker />
            <BrushSpanSlider />
            <BrushShadowPanel />
            <LayerFxPicker />
          </DockSection>

          <DockSection id="sensors" focus={focus} onFocus={setSectionFocus}>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-subtle">Sensors</h3>
            <label className="flex flex-col gap-2">
              <div className="flex justify-between text-[12px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  Camera interact
                  <TipMark id="cam-interact" />
                </span>
                <span className="font-mono tabular-nums text-fg">{Math.round(cameraInteract * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={cameraInteract}
                onChange={(e) => setCameraInteract(parseFloat(e.target.value))}
                className="w-full"
                suppressHydrationWarning
              />
            </label>
            <label className="flex flex-col gap-2">
              <div className="flex justify-between text-[12px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  Mic sensitivity
                  <TipMark id="mic-sens" />
                </span>
                <span className="font-mono tabular-nums text-fg">{Math.round(micSensitivity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.01}
                value={micSensitivity}
                onChange={(e) => setMicSensitivity(parseFloat(e.target.value))}
                className="w-full"
                suppressHydrationWarning
              />
            </label>
            <label className="flex flex-col gap-2">
              <div className="flex justify-between text-[12px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  Gyro sensitivity
                  <TipMark id="gyro-sens" />
                </span>
                <span className="font-mono tabular-nums text-fg">{Math.round(gyroSensitivity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={gyroSensitivity}
                onChange={(e) => setGyroSensitivity(parseFloat(e.target.value))}
                className="w-full"
                suppressHydrationWarning
              />
            </label>
            <label className="flex flex-col gap-2">
              <div className="flex justify-between text-[12px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  Gyro zoom
                  <TipMark id="gyro-zoom" />
                </span>
                <span className="font-mono tabular-nums text-fg">{Math.round(gyroZoom * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.01}
                value={gyroZoom}
                onChange={(e) => setGyroZoom(parseFloat(e.target.value))}
                className="w-full"
                suppressHydrationWarning
              />
            </label>
          </DockSection>

          <DockSection id="session" focus={focus} onFocus={setSectionFocus}>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-subtle">Session</h3>
            {sessionShare && (
              <SessionShare
                code={sessionShare.code}
                value={sessionShare.value}
                onChange={sessionShare.onChange}
                occupied={sessionShare.occupied}
              />
            )}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={clearSurface}
                className="flex-1 rounded-xl bg-fg/10 py-2.5 text-sm text-fg/90 hover:bg-fg/20"
              >
                Clear surface
              </button>
              <TipMark id="clear" />
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={cleanSession}
                className="flex-1 rounded-xl border border-line bg-fg/5 py-2.5 text-sm text-muted hover:bg-fg/10 hover:text-fg"
              >
                Clean Session
              </button>
              <TipMark id="clean" />
            </div>
            <TipCopy>Resets the live mix for the next person. Saved presets stay.</TipCopy>
            {showPairButton && (
              <>
                <div className="relative md:hidden">
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onShowPair?.();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onShowPair?.();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-fg/5 py-2.5 text-sm text-muted hover:bg-fg/10 hover:text-fg"
                  >
                    <Smartphone className="size-4" />
                    Pair with a larger screen
                  </button>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2">
                    <TipMark id="pair" />
                  </span>
                </div>
                <div className="relative max-md:hidden">
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onShowPair?.();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onShowPair?.();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-fg/5 py-2.5 text-sm text-muted hover:bg-fg/10 hover:text-fg"
                  >
                    <Smartphone className="size-4" />
                    Control With Secondary Device
                  </button>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2">
                    <TipMark id="pair" />
                  </span>
                </div>
              </>
            )}
            <FeedbackFooter />
          </DockSection>
          <StudioCredit />
          </div>
        </div>

        <div className="dock-scroll-rail absolute inset-y-0 right-0 z-10 flex w-7 flex-col py-1 pr-1">
          <button
            type="button"
            onClick={() => page(-1)}
            className="flex h-8 shrink-0 items-center justify-center rounded-md text-fg/70 hover:bg-fg/15 hover:text-fg"
            aria-label="Scroll menu up"
          >
            <ChevronUp className="size-3.5" />
          </button>
          <button
            type="button"
            className="dock-scroll-track min-h-8 flex-1 rounded-md hover:bg-fg/8"
            aria-label="Jump in menu"
            onClick={(e) => jumpTo(e.clientY, e.currentTarget)}
          />
          <button
            type="button"
            onClick={() => page(1)}
            className="flex h-8 shrink-0 items-center justify-center rounded-md text-fg/70 hover:bg-fg/15 hover:text-fg"
            aria-label="Scroll menu down"
          >
            <ChevronDown className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
