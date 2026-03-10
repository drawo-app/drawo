export type LineCap =
  | "none"
  | "line arrow"
  | "triangle arrow"
  | "inverted triangle"
  | "circular arrow"
  | "diamond arrow";

export interface LineElement {
  id: string;
  type: "line";
  rotation: number;
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
  startCap: LineCap;
  endCap: LineCap;
  controlPoint?: {
    x: number;
    y: number;
  } | null;
}

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
