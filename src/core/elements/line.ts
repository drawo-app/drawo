export type LineCap =
  | "none"
  | "line arrow"
  | "triangle arrow"
  | "inverted triangle"
  | "circular arrow"
  | "diamond arrow";

export interface LineElement {
  id: string;
  groupId?: string | null;
  type: "line";
  rotation: number;
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  strokeStyle: "solid" | "dashed";
  startCap: LineCap;
  endCap: LineCap;
  controlPoint?: {
    x: number;
    y: number;
  } | null;
  points?: Array<{
    x: number;
    y: number;
  }>;
}

export const hasLinePathPoints = (line: LineElement): boolean =>
  Array.isArray(line.points) && line.points.length >= 2;

export const getLinePathBounds = (
  points: Array<{ x: number; y: number }>,
): { x: number; y: number; width: number; height: number } => {
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
};

const pointToSegmentDistance = (
  pointX: number,
  pointY: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) => {
  const dx = endX - startX;
  const dy = endY - startY;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(pointX - startX, pointY - startY);
  }

  const t = Math.max(
    0,
    Math.min(1, ((pointX - startX) * dx + (pointY - startY) * dy) / lengthSquared),
  );
  const projectionX = startX + t * dx;
  const projectionY = startY + t * dy;
  return Math.hypot(pointX - projectionX, pointY - projectionY);
};

const getSmoothSegmentControls = (
  points: Array<{ x: number; y: number }>,
  index: number,
  roundness: number,
) => {
  const p0 = points[index - 1] ?? points[index];
  const p1 = points[index];
  const p2 = points[index + 1];
  const p3 = points[index + 2] ?? p2;
  const factor = Math.max(0.2, Math.min(1.8, roundness));

  return {
    p1,
    p2,
    cp1: {
      x: p1.x + ((p2.x - p0.x) * factor) / 6,
      y: p1.y + ((p2.y - p0.y) * factor) / 6,
    },
    cp2: {
      x: p2.x - ((p3.x - p1.x) * factor) / 6,
      y: p2.y - ((p3.y - p1.y) * factor) / 6,
    },
  };
};

export const hitTestLine = (
  line: LineElement,
  pointX: number,
  pointY: number,
): boolean => {
  const tolerance = Math.max(8, line.strokeWidth * 1.5);

  const centerX = line.x + line.width / 2;
  const centerY = line.y + line.height / 2;
  const angleRadians = (line.rotation * Math.PI) / 180;
  const cos = Math.cos(-angleRadians);
  const sin = Math.sin(-angleRadians);

  const dx = pointX - centerX;
  const dy = pointY - centerY;

  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;

  if (hasLinePathPoints(line) && line.points) {
    const localPoints = line.points.map((point) => {
      const px = point.x - centerX;
      const py = point.y - centerY;

      return {
        x: px * cos - py * sin,
        y: px * sin + py * cos,
      };
    });

    if (localPoints.length === 1) {
      return (
        Math.hypot(localX - localPoints[0].x, localY - localPoints[0].y) <=
        tolerance
      );
    }

    if (localPoints.length === 2) {
      return (
        pointToSegmentDistance(
          localX,
          localY,
          localPoints[0].x,
          localPoints[0].y,
          localPoints[1].x,
          localPoints[1].y,
        ) <= tolerance
      );
    }

    for (let index = 0; index < localPoints.length - 1; index++) {
      const segment = getSmoothSegmentControls(localPoints, index, 1.25);
      let previous = { x: segment.p1.x, y: segment.p1.y };
      const sampleCount = 18;

      for (let sampleIndex = 1; sampleIndex <= sampleCount; sampleIndex++) {
        const t = sampleIndex / sampleCount;
        const invT = 1 - t;
        const current = {
          x:
            invT * invT * invT * segment.p1.x +
            3 * invT * invT * t * segment.cp1.x +
            3 * invT * t * t * segment.cp2.x +
            t * t * t * segment.p2.x,
          y:
            invT * invT * invT * segment.p1.y +
            3 * invT * invT * t * segment.cp1.y +
            3 * invT * t * t * segment.cp2.y +
            t * t * t * segment.p2.y,
        };

        if (
          pointToSegmentDistance(
            localX,
            localY,
            previous.x,
            previous.y,
            current.x,
            current.y,
          ) <= tolerance
        ) {
          return true;
        }

        previous = current;
      }
    }

    return false;
  }

  const start = { x: line.x - centerX, y: line.y - centerY };
  const end = {
    x: line.x + line.width - centerX,
    y: line.y + line.height - centerY,
  };
  const throughPoint = line.controlPoint
    ? {
        x: line.controlPoint.x - centerX,
        y: line.controlPoint.y - centerY,
      }
    : null;

  if (!throughPoint) {
    const dx2 = end.x - start.x;
    const dy2 = end.y - start.y;
    const len2 = dx2 * dx2 + dy2 * dy2;

    if (len2 === 0) {
      return Math.hypot(localX - start.x, localY - start.y) <= tolerance;
    }

    let t = ((localX - start.x) * dx2 + (localY - start.y) * dy2) / len2;
    t = Math.max(0, Math.min(1, t));

    const closestX = start.x + t * dx2;
    const closestY = start.y + t * dy2;

    return Math.hypot(localX - closestX, localY - closestY) <= tolerance;
  }

  const control = {
    x: throughPoint.x * 2 - (start.x + end.x) * 0.5,
    y: throughPoint.y * 2 - (start.y + end.y) * 0.5,
  };

  const sampleCount = 28;
  let previous = start;

  for (let index = 1; index <= sampleCount; index++) {
    const t = index / sampleCount;
    const invT = 1 - t;
    const current = {
      x: invT * invT * start.x + 2 * invT * t * control.x + t * t * end.x,
      y: invT * invT * start.y + 2 * invT * t * control.y + t * t * end.y,
    };

    const segmentX = current.x - previous.x;
    const segmentY = current.y - previous.y;
    const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

    if (segmentLengthSquared > 0) {
      const segmentT = Math.max(
        0,
        Math.min(
          1,
          ((localX - previous.x) * segmentX +
            (localY - previous.y) * segmentY) /
            segmentLengthSquared,
        ),
      );

      const projectionX = previous.x + segmentT * segmentX;
      const projectionY = previous.y + segmentT * segmentY;

      if (Math.hypot(localX - projectionX, localY - projectionY) <= tolerance) {
        return true;
      }
    }

    previous = current;
  }

  return false;
};
