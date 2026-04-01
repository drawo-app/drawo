import { rotatePointAroundCenter } from "./mathUtils";

export interface DrawPoint {
  x: number;
  y: number;
  t?: number;
}

export interface DrawElement {
  id: string;
  groupId?: string | null;
  type: "draw";
  drawMode: "draw" | "marker" | "quill";
  createdAt?: number;
  rotation: number;
  x: number;
  opacity: number;
  y: number;
  width: number;
  height: number;
  points: DrawPoint[];
  stroke: string;
  strokeWidth: number;
}

/**
 * Returns the padding to add on each side of a draw element's bounding box
 * to account for stroke width depending on draw mode.
 * Used in bounds calculations for hit testing and transforms.
 */
export const getDrawPadding = (
  strokeWidth: number,
  drawMode: "draw" | "marker" | "quill",
): number => {
  if (drawMode === "marker") {
    return Math.max(6, strokeWidth * 0.65);
  }

  if (drawMode === "quill") {
    return Math.max(4, strokeWidth * 1.45);
  }

  return Math.max(3, strokeWidth / 2);
};

const getDistanceToSegment = (
  pointX: number,
  pointY: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): number => {
  const segmentX = endX - startX;
  const segmentY = endY - startY;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared === 0) {
    return Math.hypot(pointX - startX, pointY - startY);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((pointX - startX) * segmentX + (pointY - startY) * segmentY) /
        segmentLengthSquared,
    ),
  );

  const projectionX = startX + t * segmentX;
  const projectionY = startY + t * segmentY;

  return Math.hypot(pointX - projectionX, pointY - projectionY);
};

export const hitTestDraw = (
  draw: DrawElement,
  pointX: number,
  pointY: number,
): boolean => {
  if (draw.points.length === 0) {
    return false;
  }

  const centerX = draw.x + draw.width / 2;
  const centerY = draw.y + draw.height / 2;
  const pointInLocal = rotatePointAroundCenter(
    pointX,
    pointY,
    centerX,
    centerY,
    (-draw.rotation * Math.PI) / 180,
  );

  const localX = pointInLocal.x - draw.x;
  const localY = pointInLocal.y - draw.y;
  const tolerance =
    draw.drawMode === "marker"
      ? Math.max(8, draw.strokeWidth * 1.35)
      : draw.drawMode === "quill"
        ? Math.max(7, draw.strokeWidth * 2.2)
        : Math.max(6, draw.strokeWidth * 2);

  for (let index = 1; index < draw.points.length; index++) {
    const start = draw.points[index - 1];
    const end = draw.points[index];
    const distance = getDistanceToSegment(
      localX,
      localY,
      start.x,
      start.y,
      end.x,
      end.y,
    );

    if (distance <= tolerance) {
      return true;
    }
  }

  if (draw.points.length === 1) {
    const point = draw.points[0];
    return Math.hypot(localX - point.x, localY - point.y) <= tolerance;
  }

  return false;
};
