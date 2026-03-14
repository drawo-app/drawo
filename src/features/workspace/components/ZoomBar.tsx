import { Minus, Plus } from "lucide-react";

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
  const displayedZoomPercent = Math.max(0, Math.min(200, zoomPercent));

  return (
    <div className="zoom-bar bottompanel-bar">
      <button
        type="button"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        aria-label="Zoom out"
      >
        <Minus strokeWidth={1} />
      </button>
      <div className="bottompanel-separator" />
      <button type="button" onClick={onZoomReset} aria-label="Reset zoom">
        <span>{displayedZoomPercent}%</span>
      </button>
      <div className="bottompanel-separator" />
      <button
        type="button"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        aria-label="Zoom in"
      >
        <Plus strokeWidth={1} />
      </button>
    </div>
  );
}
