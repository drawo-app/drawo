import { estimateTextHeight, estimateTextWidth, getTextStartX } from "../../core/elements";
import type { Scene } from "../../core/scene";
import type { SceneElement } from "../../core/elements";
import { MIN_ELEMENT_SIZE } from "./constants";
import type { Bounds } from "./types";
import type { ResizeHandle } from "../types";

export const snapValue = (value: number, gridSize: number): number => {
  return Math.round(value / gridSize) * gridSize;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

export const getResizedBoundsFromCorner = (
  bounds: Bounds,
  handle: ResizeHandle,
  pointerX: number,
  pointerY: number,
): Bounds => {
  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;

  if (handle === "nw") {
    const nextX = Math.min(pointerX, right - MIN_ELEMENT_SIZE);
    const nextY = Math.min(pointerY, bottom - MIN_ELEMENT_SIZE);

    return {
      x: nextX,
      y: nextY,
      width: right - nextX,
      height: bottom - nextY,
    };
  }

  if (handle === "ne") {
    const nextRight = Math.max(pointerX, bounds.x + MIN_ELEMENT_SIZE);
    const nextY = Math.min(pointerY, bottom - MIN_ELEMENT_SIZE);

    return {
      x: bounds.x,
      y: nextY,
      width: nextRight - bounds.x,
      height: bottom - nextY,
    };
  }

  if (handle === "sw") {
    const nextX = Math.min(pointerX, right - MIN_ELEMENT_SIZE);
    const nextBottom = Math.max(pointerY, bounds.y + MIN_ELEMENT_SIZE);

    return {
      x: nextX,
      y: bounds.y,
      width: right - nextX,
      height: nextBottom - bounds.y,
    };
  }

  const nextRight = Math.max(pointerX, bounds.x + MIN_ELEMENT_SIZE);
  const nextBottom = Math.max(pointerY, bounds.y + MIN_ELEMENT_SIZE);

  return {
    x: bounds.x,
    y: bounds.y,
    width: nextRight - bounds.x,
    height: nextBottom - bounds.y,
  };
};

export const getAspectRatioLockedBounds = (
  bounds: Bounds,
  handle: ResizeHandle,
  aspectRatio: number,
  fromCenter: boolean,
): Bounds => {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    return bounds;
  }

  const widthFromHeight = Math.max(1, bounds.height * aspectRatio);
  const heightFromWidth = Math.max(1, bounds.width / aspectRatio);
  const useWidthDriven =
    Math.abs(heightFromWidth - bounds.height) <=
    Math.abs(widthFromHeight - bounds.width);

  const lockedWidth = useWidthDriven ? bounds.width : widthFromHeight;
  const lockedHeight = useWidthDriven ? heightFromWidth : bounds.height;

  if (fromCenter) {
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    return {
      x: centerX - lockedWidth / 2,
      y: centerY - lockedHeight / 2,
      width: lockedWidth,
      height: lockedHeight,
    };
  }

  if (handle === "nw") {
    const anchorX = bounds.x + bounds.width;
    const anchorY = bounds.y + bounds.height;

    return {
      x: anchorX - lockedWidth,
      y: anchorY - lockedHeight,
      width: lockedWidth,
      height: lockedHeight,
    };
  }

  if (handle === "ne") {
    const anchorY = bounds.y + bounds.height;

    return {
      x: bounds.x,
      y: anchorY - lockedHeight,
      width: lockedWidth,
      height: lockedHeight,
    };
  }

  if (handle === "sw") {
    const anchorX = bounds.x + bounds.width;

    return {
      x: anchorX - lockedWidth,
      y: bounds.y,
      width: lockedWidth,
      height: lockedHeight,
    };
  }

  return {
    x: bounds.x,
    y: bounds.y,
    width: lockedWidth,
    height: lockedHeight,
  };
};

export const getTextXFromBounds = (
  bounds: Bounds,
  textAlign: CanvasTextAlign,
): number => {
  if (textAlign === "center") {
    return bounds.x + bounds.width / 2;
  }

  if (textAlign === "right" || textAlign === "end") {
    return bounds.x + bounds.width;
  }

  return bounds.x;
};

export const getSelectedIds = (scene: Scene): string[] => {
  if (scene.selectedIds.length > 0) {
    return scene.selectedIds;
  }

  return scene.selectedId ? [scene.selectedId] : [];
};

export const getElementBounds = (element: SceneElement): Bounds => {
  if (element.type === "rectangle" || element.type === "circle") {
    return {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    };
  }

  if (element.type === "draw") {
    return {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    };
  }

  return {
    x: getTextStartX(element),
    y: element.y - element.fontSize,
    width: Math.max(16, estimateTextWidth(element)),
    height: estimateTextHeight(element),
  };
};
