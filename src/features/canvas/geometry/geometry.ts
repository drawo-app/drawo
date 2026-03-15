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

export const findCornerAction = (
  bounds: ElementBounds,
  pointX: number,
  pointY: number,
  zoom: number,
): CornerAction | null => {
  const resizeRadius = HANDLE_RESIZE_RADIUS_PX / zoom;
  const rotateRadius = HANDLE_ROTATE_RADIUS_PX / zoom;
  const handles: ResizeHandle[] = ["nw", "ne", "se", "sw"];

  for (const handle of handles) {
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
