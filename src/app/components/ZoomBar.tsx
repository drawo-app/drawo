import { Minus, Plus } from "@gravity-ui/icons";

interface ZoomBarProps {
  zoomPercent: number;
  canZoomOut: boolean;
  canZoomIn: boolean;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onZoomReset: () => void;
}

export function ZoomBar({
  zoomPercent,
  canZoomOut,
  canZoomIn,
  onZoomOut,
  onZoomIn,
  onZoomReset,
}: ZoomBarProps) {
  return (
    <div className="zoom-bar bottompanel-bar">
      <button
        type="button"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        aria-label="Zoom out"
      >
        <Minus />
      </button>
      <button type="button" onClick={onZoomReset} aria-label="Reset zoom">
        <span>{zoomPercent}%</span>
      </button>
      <button
        type="button"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        aria-label="Zoom in"
      >
        <Plus />
      </button>
    </div>
  );
}
