import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, SwitchCamera } from "lucide-react";
import { TipMark } from "./tip-mark";
import { useRippleStore } from "@/store/ripple";

type CamState = "off" | "rear" | "front";

type Props = {
  camState: CamState;
  busy: boolean;
  onCycle: () => void;
  camLabel: string;
};

function longerSideHorizontal() {
  if (typeof window === "undefined") return true;
  return window.innerWidth >= window.innerHeight;
}

export function CameraOpacitySlider({ camState, busy, onCycle, camLabel }: Props) {
  const opacity = useRippleStore((s) => s.cameraOpacity);
  const setOpacity = useRippleStore((s) => s.setCameraOpacity);
  const [horizontal, setHorizontal] = useState(longerSideHorizontal);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const startRef = useRef({ x: 0, y: 0, value: 1 });

  useEffect(() => {
    const sync = () => setHorizontal(longerSideHorizontal());
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  const live = camState !== "off";
  const CamIcon = camState === "off" ? CameraOff : camState === "rear" ? Camera : SwitchCamera;
  const t = Math.max(0, Math.min(1, 1 - opacity));

  const valueFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const track = trackRef.current;
      if (!track) return opacity;
      const r = track.getBoundingClientRect();
      const along = horizontal ? (clientX - r.left) / Math.max(1, r.width) : (clientY - r.top) / Math.max(1, r.height);
      return Math.max(0, Math.min(1, 1 - along));
    },
    [horizontal, opacity],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (busy) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    moved.current = false;
    startRef.current = { x: e.clientX, y: e.clientY, value: opacity };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging.current) return;
    e.preventDefault();
    e.stopPropagation();
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (!moved.current && dx * dx + dy * dy < 36) return;
    if (!live) return;
    moved.current = true;
    setOpacity(valueFromEvent(e.clientX, e.clientY));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging.current) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (!moved.current) onCycle();
  };

  return (
    <div
      data-cam-slider={live ? "1" : "0"}
      data-cam-axis={horizontal ? "h" : "v"}
      data-cam-opacity={Math.round(opacity * 100)}
      className={"cam-opacity " + (horizontal ? "is-h" : "is-v") + (live ? " is-live" : "")}
    >
      {live ? (
        <div ref={trackRef} className="cam-opacity-track" aria-hidden>
          <span className="cam-opacity-fill" />
        </div>
      ) : (
        <div ref={trackRef} className="cam-opacity-track is-idle" aria-hidden />
      )}
      <button
        type="button"
        className="cam-opacity-thumb"
        style={
          live
            ? {
                opacity: 1,
                ...(horizontal
                  ? { left: `calc(${t * 100}% - ${t * 2.75}rem)` }
                  : { top: `calc(${t * 100}% - ${t * 2.75}rem)` }),
              }
            : { opacity: 0.5 }
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        disabled={busy}
        aria-label={live ? `${camLabel}. Drag for opacity, ${Math.round(opacity * 100)} percent opaque` : camLabel}
        title={live ? "Drag opaque → transparent. Tap to cycle camera." : camLabel}
      >
        <CamIcon className="size-4" strokeWidth={1.75} />
        {camState !== "off" && (
          <span className="absolute -bottom-0.5 rounded-full bg-ink/90 px-1 text-[8px] font-semibold tracking-wide text-fg">
            {camState === "rear" ? "REAR" : "FRONT"}
          </span>
        )}
        {camState === "off" && (
          <span className="absolute -bottom-0.5 rounded-full bg-ink/70 px-1 text-[8px] font-semibold tracking-wide text-fg/70">
            OFF
          </span>
        )}
      </button>
      <TipMark id="camera" className="pointer-events-auto absolute -right-0.5 -top-0.5 z-20" />
    </div>
  );
}
