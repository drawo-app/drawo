import type { CircleElement, RectangleElement } from "@core/elements";
import {
  HANDLE_RESIZE_RADIUS_PX,
  HANDLE_ROTATE_RADIUS_PX,
  SHAPE_TEXT_HORIZONTAL_PADDING_PX,
} from "@features/canvas/rendering/constants";
import type { ElementBounds, ResizeHandle } from "@features/canvas/types";

export const getAlignedStartX = (
  anchorX: number,
  width: number,
  textAlign: CanvasTextAlign,
): number => {
  if (textAlign === "center") {
    return anchorX - width / 2;
  }

  if (textAlign === "right" || textAlign === "end") {
    return anchorX - width;
  }

  return anchorX;
};

export const getTextAlignSelectValue = (
  textAlign?: CanvasTextAlign,
): "left" | "center" | "end" => {
  if (textAlign === "center") {
    return "center";
  }

  if (textAlign === "right" || textAlign === "end") {
    return "end";
  }

  return "left";
};

export const getResizeCursor = (handle: ResizeHandle): string => {
  if (handle === "n" || handle === "s") {
    return "ns-resize";
  }

  if (handle === "e" || handle === "w") {
    return "ew-resize";
  }

  if (handle === "nw" || handle === "se") {
    return "nwse-resize";
  }

  return "nesw-resize";
};

export const getRotateCursor = (handle: ResizeHandle): string => {
  switch (handle) {
    case "nw":
      return "rotate-down-left";
    case "ne":
      return "rotate-down-right";
    case "sw":
      return "rotate-up-left";
    case "se":
      return "rotate-up-right";
    default:
      return "nesw-resize";
  }
};

export const getHandleCenter = (
  bounds: ElementBounds,
  handle: ResizeHandle,
) => {
  if (handle === "nw") {
    return { x: bounds.x, y: bounds.y };
  }

  if (handle === "ne") {
    return { x: bounds.x + bounds.width, y: bounds.y };
  }

  if (handle === "sw") {
    return { x: bounds.x, y: bounds.y + bounds.height };
  }

  if (handle === "n") {
    return { x: bounds.x + bounds.width / 2, y: bounds.y };
  }

  if (handle === "e") {
    return { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 };
  }

  if (handle === "s") {
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height };
  }

  if (handle === "w") {
    return { x: bounds.x, y: bounds.y + bounds.height / 2 };
  }

  return { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
};

export const rotatePointAroundCenter = (
  pointX: number,
  pointY: number,
  centerX: number,
  centerY: number,
  angleRadians: number,
) => {
  const cos = Math.cos(angleRadians);
  const sin = Math.sin(angleRadians);
  const dx = pointX - centerX;
  const dy = pointY - centerY;

  return {
    x: dx * cos - dy * sin + centerX,
    y: dx * sin + dy * cos + centerY,
  };
};

export const getBoundsCenter = (bounds: ElementBounds) => ({
  x: bounds.x + bounds.width / 2,
  y: bounds.y + bounds.height / 2,
});

export const getShapeTextAnchorX = (
  element: Pick<RectangleElement | CircleElement, "x" | "width">,
  textAlign: CanvasTextAlign,
): number => {
  if (textAlign === "center") {
    return element.x + element.width / 2;
  }

  if (textAlign === "right" || textAlign === "end") {
    return element.x + element.width - SHAPE_TEXT_HORIZONTAL_PADDING_PX;
  }

  return element.x + SHAPE_TEXT_HORIZONTAL_PADDING_PX;
};

export type CornerAction = {
  handle: ResizeHandle;
  mode: "resize" | "rotate";
};

const isPointNearHorizontalEdge = (
  pointX: number,
  pointY: number,
  startX: number,
  endX: number,
  edgeY: number,
  tolerance: number,
) => {
  return (
    pointX >= startX - tolerance &&
    pointX <= endX + tolerance &&
    Math.abs(pointY - edgeY) <= tolerance
  );
};

const isPointNearVerticalEdge = (
  pointX: number,
  pointY: number,
  edgeX: number,
  startY: number,
  endY: number,
  tolerance: number,
) => {
  return (
    pointY >= startY - tolerance &&
    pointY <= endY + tolerance &&
    Math.abs(pointX - edgeX) <= tolerance
  );
};

export const findCornerAction = (
  bounds: ElementBounds,
  pointX: number,
  pointY: number,
  zoom: number,
): CornerAction | null => {
  const resizeRadius = HANDLE_RESIZE_RADIUS_PX / zoom;
  const rotateRadius = HANDLE_ROTATE_RADIUS_PX / zoom;
  const cornerHandles: ResizeHandle[] = ["nw", "ne", "se", "sw"];

  for (const handle of cornerHandles) {
    const center = getHandleCenter(bounds, handle);
    const dx = pointX - center.x;
    const dy = pointY - center.y;
    const distance = Math.hypot(dx, dy);

    if (distance <= resizeRadius) {
      return { handle, mode: "resize" };
    }

    if (distance <= rotateRadius) {
      return { handle, mode: "rotate" };
    }
  }

  return null;
};

const EDGE_RESIZE_TOLERANCE_PX = 8;

export const findEdgeResizeAction = (
  bounds: ElementBounds,
  pointX: number,
  pointY: number,
  zoom: number,
): CornerAction | null => {
  const tolerance = Math.max(EDGE_RESIZE_TOLERANCE_PX, HANDLE_RESIZE_RADIUS_PX) / zoom;
  const left = bounds.x;
  const right = bounds.x + bounds.width;
  const top = bounds.y;
  const bottom = bounds.y + bounds.height;

  if (
    isPointNearHorizontalEdge(pointX, pointY, left, right, top, tolerance)
  ) {
    return { handle: "n", mode: "resize" };
  }

  if (
    isPointNearHorizontalEdge(pointX, pointY, left, right, bottom, tolerance)
  ) {
    return { handle: "s", mode: "resize" };
  }

  if (isPointNearVerticalEdge(pointX, pointY, left, top, bottom, tolerance)) {
    return { handle: "w", mode: "resize" };
  }

  if (isPointNearVerticalEdge(pointX, pointY, right, top, bottom, tolerance)) {
    return { handle: "e", mode: "resize" };
  }

  return null;
};

export const findResizeAction = (
  bounds: ElementBounds,
  pointX: number,
  pointY: number,
  zoom: number,
): CornerAction | null => {
  const cornerAction = findCornerAction(bounds, pointX, pointY, zoom);
  if (cornerAction) {
    return cornerAction;
  }

  return findEdgeResizeAction(bounds, pointX, pointY, zoom);
};
