export interface DrawPoint {
  x: number;
  y: number;
}

export interface DrawElement {
  id: string;
  type: "draw";
  drawMode: "draw" | "marker";
  createdAt?: number;
  rotation: number;
  x: number;
  y: number;
  width: number;
  height: number;
  points: DrawPoint[];
  stroke: string;
  strokeWidth: number;
}

const rotatePointAroundCenter = (
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
