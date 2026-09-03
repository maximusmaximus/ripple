import { useCallback, useRef } from "react";
import { PIN_META, resolvePinnedActive, type PinId } from "@/lib/ripple/pins";
import { useRippleStore } from "@/store/ripple";

export function PinnedSliders() {
  const ids = useRippleStore((s) => s.pinnedSliders);
  const rawActive = useRippleStore((s) => s.pinnedActive);
  const active = resolvePinnedActive(rawActive, ids);
  if (ids.length === 0) return null;
  return (
    <div
      data-ui-chrome
      data-pinned-sliders="true"
      data-pin-count={ids.length}
      data-pin-active={active ?? ""}
      className="pinned-sliders"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {ids.map((id) => (
        <PinnedSlider key={id} id={id} active={id === active} />
      ))}
    </div>
  );
}

function PinnedSlider({ id, active }: { id: PinId; active: boolean }) {
  const meta = PIN_META[id];
  const value = useRippleStore((s) => {
    switch (id) {
      case "viscosity":
        return s.viscosity;
      case "wave":
        return s.waveStrength;
      case "cam-interact":
        return s.cameraInteract;
      case "mic-sens":
        return s.micSensitivity;
      case "gyro-sens":
        return s.gyroSensitivity;
      case "gyro-zoom":
        return s.gyroZoom;
      case "fx-opacity":
        return s.brushFxOpacity;
    }
  });
  const setViscosity = useRippleStore((s) => s.setViscosity);
  const setWaveStrength = useRippleStore((s) => s.setWaveStrength);
  const setCameraInteract = useRippleStore((s) => s.setCameraInteract);
  const setMicSensitivity = useRippleStore((s) => s.setMicSensitivity);
  const setGyroSensitivity = useRippleStore((s) => s.setGyroSensitivity);
  const setGyroZoom = useRippleStore((s) => s.setGyroZoom);
  const setBrushFxOpacity = useRippleStore((s) => s.setBrushFxOpacity);
  const setPinnedActive = useRippleStore((s) => s.setPinnedActive);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setValue = useCallback(
    (v: number) => {
      switch (id) {
        case "viscosity":
          setViscosity(v);
          break;
        case "wave":
          setWaveStrength(v);
          break;
        case "cam-interact":
          setCameraInteract(v);
          break;
        case "mic-sens":
          setMicSensitivity(v);
          break;
        case "gyro-sens":
          setGyroSensitivity(v);
          break;
        case "gyro-zoom":
          setGyroZoom(v);
          break;
        case "fx-opacity":
          setBrushFxOpacity(v);
          break;
      }
    },
    [id, setViscosity, setWaveStrength, setCameraInteract, setMicSensitivity, setGyroSensitivity, setGyroZoom, setBrushFxOpacity],
  );

  const valueFromEvent = useCallback(
    (clientY: number) => {
      const track = trackRef.current;
      if (!track) return value;
      const r = track.getBoundingClientRect();
      const along = (clientY - r.top) / Math.max(1, r.height);
      const t = Math.max(0, Math.min(1, 1 - along));
      return meta.min + t * (meta.max - meta.min);
    },
    [meta.max, meta.min, value],
  );

  const span = Math.max(1e-6, meta.max - meta.min);
  const t = Math.max(0, Math.min(1, (meta.max - value) / span));

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    setPinnedActive(id);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic / already captured */
    }
    setValue(valueFromEvent(e.clientY));
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging.current) return;
    e.preventDefault();
    e.stopPropagation();
    setValue(valueFromEvent(e.clientY));
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
  };

  return (
    <div
      data-pinned-slider={id}
      data-pin-axis="v"
      data-pin-slot={active ? "active" : "idle"}
      className={"pinned-slider" + (active ? " is-active" : "")}
      title={`${meta.label} ${meta.format(value)}${active ? " · next pin lands here" : ""}`}
    >
      <div ref={trackRef} className="pinned-slider-track" aria-hidden />
      <button
        type="button"
        className="pinned-slider-thumb"
        style={{ top: `calc(${t * 100}% - ${t * 2.75}rem)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label={`${meta.label}, ${meta.format(value)}${active ? ", next pin lands here" : ""}`}
        aria-valuemin={meta.min}
        aria-valuemax={meta.max}
        aria-valuenow={value}
        aria-orientation="vertical"
      >
        <span className="pinned-slider-name">{meta.short}</span>
      </button>
    </div>
  );
}
