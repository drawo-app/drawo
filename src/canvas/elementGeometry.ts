import type { DrawElement, LineCap, LineElement } from "../core/elements";
import { rotatePointAroundCenter } from "./geometry";
import type { ElementBounds } from "./types";

export const getLineCapPadding = (
  cap: LineCap,
  strokeWidth: number,
): number => {
  if (
    cap === "line arrow" ||
    cap === "triangle arrow" ||
    cap === "inverted triangle" ||
    cap === "diamond arrow"
  ) {
    return Math.max(12, strokeWidth * 2);
  }

  if (cap === "circular arrow") {
    return Math.max(9, strokeWidth * 1.2);
  }

  return 0;
};

export const getDrawSelectionBounds = (
  element: DrawElement,
): ElementBounds => {
  const padding =
    element.drawMode === "marker"
      ? Math.max(6, element.strokeWidth * 0.65)
      : element.drawMode === "quill"
        ? Math.max(4, element.strokeWidth * 1.45)
        : Math.max(3, element.strokeWidth / 2);

  return {
    x: element.x - padding,
    y: element.y - padding,
    width: element.width + padding * 2,
    height: element.height + padding * 2,
  };
};

export const getLineSelectionBounds = (
  element: LineElement,
): ElementBounds => {
  const startX = element.x;
  const startY = element.y;
  const endX = element.x + element.width;
  const endY = element.y + element.height;
  const controlX = element.controlPoint
    ? element.controlPoint.x
    : startX + (endX - startX) / 2;
  const controlY = element.controlPoint
    ? element.controlPoint.y
    : startY + (endY - startY) / 2;
  const curveControlX = controlX * 2 - (startX + endX) * 0.5;
  const curveControlY = controlY * 2 - (startY + endY) * 0.5;
  const minX = Math.min(startX, endX, controlX, curveControlX);
  const minY = Math.min(startY, endY, controlY, curveControlY);
  const maxX = Math.max(startX, endX, controlX, curveControlX);
  const maxY = Math.max(startY, endY, controlY, curveControlY);
  const strokePadding = Math.max(2, element.strokeWidth / 2);
  const capPadding = Math.max(
    getLineCapPadding(element.startCap, element.strokeWidth),
    getLineCapPadding(element.endCap, element.strokeWidth),
  );
  const padding = strokePadding + capPadding;

  return {
    x: minX - padding,
    y: minY - padding,
    width: Math.max(1, maxX - minX) + padding * 2,
    height: Math.max(1, maxY - minY) + padding * 2,
  };
};

export const getLineMidpoint = (line: LineElement) => ({
  x: line.x + line.width / 2,
  y: line.y + line.height / 2,
});

export const getLinePoints = (line: LineElement) => {
  const start = { x: line.x, y: line.y };
  const end = { x: line.x + line.width, y: line.y + line.height };
  const throughPoint = line.controlPoint ?? getLineMidpoint(line);

  return { start, end, throughPoint };
};

export const getLineCurveControlPoint = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  throughPoint: { x: number; y: number },
) => {
  return {
    x: throughPoint.x * 2 - (start.x + end.x) * 0.5,
    y: throughPoint.y * 2 - (start.y + end.y) * 0.5,
  };
};

export const toLineLocalPointer = (
  line: LineElement,
  pointX: number,
  pointY: number,
) => {
  const center = {
    x: line.x + line.width / 2,
    y: line.y + line.height / 2,
  };

  return rotatePointAroundCenter(
    pointX,
    pointY,
    center.x,
    center.y,
    (-line.rotation * Math.PI) / 180,
  );
};
