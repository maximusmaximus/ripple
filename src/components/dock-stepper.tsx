import { ChevronDown, ChevronUp } from "lucide-react";

export function DockStepper({
  onUp,
  onDown,
  canUp,
  canDown,
}: {
  onUp: () => void;
  onDown: () => void;
  canUp: boolean;
  canDown: boolean;
}) {
  return (
    <div className="dock-stepper" data-dock-stepper="true" data-ui-chrome>
      <button
        type="button"
        data-dock-step="up"
        className="dock-step"
        aria-label="Previous menu section"
        title="Previous section"
        disabled={!canUp}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onUp();
        }}
      >
        <ChevronUp className="size-5" strokeWidth={2} />
      </button>
      <button
        type="button"
        data-dock-step="down"
        className="dock-step"
        aria-label="Next menu section"
        title="Next section"
        disabled={!canDown}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDown();
        }}
      >
        <ChevronDown className="size-5" strokeWidth={2} />
      </button>
    </div>
  );
}
