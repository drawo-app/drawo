import { useDrawo } from "../context";
import { ZoomBar } from "@features/workspace/components/ZoomBar";
import {
  MAX_CAMERA_ZOOM,
  MIN_CAMERA_ZOOM,
} from "@features/canvas/interaction/constants";

export function DrawoZoomBar() {
  const ctx = useDrawo();
  const { scene, handlers } = ctx;

  return (
    <div className="drawo-bottomright-bar">
      <ZoomBar
        zoomPercent={Math.round(scene.camera.zoom * 100)}
        canZoomOut={scene.camera.zoom > MIN_CAMERA_ZOOM}
        canZoomIn={scene.camera.zoom < MAX_CAMERA_ZOOM}
        onZoomOut={handlers.handleZoomOut as () => void}
        onZoomIn={handlers.handleZoomIn as () => void}
        onZoomReset={handlers.handleZoomReset as () => void}
      />
    </div>
  );
}
