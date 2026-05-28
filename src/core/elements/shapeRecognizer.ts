import type { DrawPoint } from "@core/elements";

export type RecognizedShape =
  | { type: "line"; start: { x: number; y: number }; end: { x: number; y: number } }
  | { type: "rectangle"; x: number; y: number; width: number; height: number }
  | { type: "circle"; cx: number; cy: number; rx: number; ry: number }
  | { type: "triangle"; p1: { x: number; y: number }; p2: { x: number; y: number }; p3: { x: number; y: number } }
  | null;

interface ShapeRecognitionResult {
  shape: RecognizedShape;
  confidence: number;
}

const LINEARITY_THRESHOLD = 0.92;
const CLOSURE_THRESHOLD = 0.18;
const RECTANGLE_CORNER_ANGLE_TOLERANCE = 35;
const CIRCLE_FIT_THRESHOLD = 0.28;
const MIN_POINTS_FOR_RECOGNITION = 12;

const computeBoundingBox = (points: DrawPoint[]) => {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
};

const pointToSegmentDistanceSquared = (
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number => {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return (px - ax) * (px - ax) + (py - ay) * (py - ay);
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = ax + t * dx;
  const projY = ay + t * dy;

  return (px - projX) * (px - projX) + (py - projY) * (py - projY);
};

const computeLinearity = (points: DrawPoint[]): number => {
  if (points.length < 2) return 0;

  const start = points[0];
  const end = points[points.length - 1];
  const lineLenSq = (end.x - start.x) ** 2 + (end.y - start.y) ** 2;

  if (lineLenSq < 1) return 0;

  const lineLen = Math.sqrt(lineLenSq);
  let totalDeviation = 0;

  for (const p of points) {
    const distSq = pointToSegmentDistanceSquared(p.x, p.y, start.x, start.y, end.x, end.y);
    totalDeviation += Math.sqrt(distSq);
  }

  const avgDeviation = totalDeviation / points.length;
  return 1 - Math.min(1, avgDeviation / (lineLen * 0.15));
};

const isClosed = (points: DrawPoint[]): boolean => {
  if (points.length < 4) return false;

  const start = points[0];
  const end = points[points.length - 1];
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const bbox = computeBoundingBox(points);
  const diagonal = Math.hypot(bbox.width, bbox.height);

  return diagonal > 0 && distance / diagonal < CLOSURE_THRESHOLD;
};

const resamplePoints = (points: DrawPoint[], targetCount: number): DrawPoint[] => {
  if (points.length <= targetCount) return points;

  const cumulativeDist: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    cumulativeDist.push(cumulativeDist[i - 1] + d);
  }

  const totalLength = cumulativeDist[cumulativeDist.length - 1];
  if (totalLength === 0) return [points[0]];

  const step = totalLength / (targetCount - 1);
  const resampled: DrawPoint[] = [points[0]];

  let idx = 1;
  for (let i = 1; i < targetCount - 1; i++) {
    const targetDist = i * step;
    while (idx < cumulativeDist.length - 1 && cumulativeDist[idx] < targetDist) {
      idx++;
    }

    const d0 = cumulativeDist[idx - 1];
    const d1 = cumulativeDist[idx];
    const t = d1 === d0 ? 0 : (targetDist - d0) / (d1 - d0);

    resampled.push({
      x: points[idx - 1].x + t * (points[idx].x - points[idx - 1].x),
      y: points[idx - 1].y + t * (points[idx].y - points[idx - 1].y),
    });
  }

  resampled.push(points[points.length - 1]);
  return resampled;
};

const computeCornerAngles = (points: DrawPoint[], windowSize: number): number[] => {
  const angles: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = halfWindow; i < points.length - halfWindow; i++) {
    const prev = points[i - halfWindow];
    const curr = points[i];
    const next = points[i + halfWindow];

    const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
    const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);

    let angleDiff = Math.abs(angle2 - angle1);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

    angles.push((angleDiff * 180) / Math.PI);
  }

  return angles;
};

const findCorners = (angles: number[], threshold: number, minSeparation: number): number[] => {
  const corners: number[] = [];

  for (let i = 0; i < angles.length; i++) {
    if (angles[i] > threshold) {
      if (corners.length === 0 || i - corners[corners.length - 1] >= minSeparation) {
        corners.push(i);
      } else if (angles[i] > angles[corners[corners.length - 1]]) {
        corners[corners.length - 1] = i;
      }
    }
  }

  return corners;
};

const tryRecognizeRectangle = (points: DrawPoint[]): ShapeRecognitionResult | null => {
  if (points.length < MIN_POINTS_FOR_RECOGNITION) return null;

  const resampled = resamplePoints(points, 60);
  const windowSize = Math.max(3, Math.floor(resampled.length / 20));
  const angles = computeCornerAngles(resampled, windowSize);
  const corners = findCorners(angles, 60, Math.floor(resampled.length / 8));

  if (corners.length < 3 || corners.length > 5) return null;

  const cornerPoints = corners.map(i => resampled[Math.min(i + Math.floor(windowSize / 2), resampled.length - 1)]);

  if (cornerPoints.length === 4) {
    const bbox = computeBoundingBox(cornerPoints);
    const diagonal = Math.hypot(bbox.width, bbox.height);

    if (diagonal < 10) return null;

    let rightAngleCount = 0;
    for (let i = 0; i < 4; i++) {
      const prev = cornerPoints[(i + 3) % 4];
      const curr = cornerPoints[i];
      const next = cornerPoints[(i + 1) % 4];

      const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
      const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
      let angleDiff = Math.abs(angle2 - angle1);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
      const angleDeg = (angleDiff * 180) / Math.PI;

      if (Math.abs(angleDeg - 90) < RECTANGLE_CORNER_ANGLE_TOLERANCE) {
        rightAngleCount++;
      }
    }

    if (rightAngleCount >= 3) {
      const bboxAll = computeBoundingBox(points);
      const confidence = rightAngleCount / 4;

      return {
        shape: {
          type: "rectangle",
          x: bboxAll.minX,
          y: bboxAll.minY,
          width: bboxAll.width,
          height: bboxAll.height,
        },
        confidence,
      };
    }
  }

  if (corners.length === 3 || corners.length === 5) {
    const bbox = computeBoundingBox(points);
    const diagonal = Math.hypot(bbox.width, bbox.height);
    if (diagonal < 10) return null;

    const aspectRatio = Math.max(bbox.width, bbox.height) / Math.max(1, Math.min(bbox.width, bbox.height));
    if (aspectRatio > 8) return null;

    return {
      shape: {
        type: "rectangle",
        x: bbox.minX,
        y: bbox.minY,
        width: bbox.width,
        height: bbox.height,
      },
      confidence: 0.6,
    };
  }

  return null;
};

const tryRecognizeCircle = (points: DrawPoint[]): ShapeRecognitionResult | null => {
  if (points.length < MIN_POINTS_FOR_RECOGNITION) return null;

  const bbox = computeBoundingBox(points);
  const diagonal = Math.hypot(bbox.width, bbox.height);
  if (diagonal < 10) return null;

  let sumX = 0, sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  const centerX = sumX / points.length;
  const centerY = sumY / points.length;

  const distances = points.map(p => Math.hypot(p.x - centerX, p.y - centerY));
  const avgRadius = distances.reduce((a, b) => a + b, 0) / distances.length;

  if (avgRadius < 5) return null;

  const radiusVariance = distances.reduce((sum, d) => sum + (d - avgRadius) ** 2, 0) / distances.length;
  const radiusStdDev = Math.sqrt(radiusVariance);
  const circularity = 1 - Math.min(1, radiusStdDev / avgRadius);

  if (circularity < CIRCLE_FIT_THRESHOLD + 0.5) return null;

  const aspectRatio = Math.max(bbox.width, bbox.height) / Math.max(1, Math.min(bbox.width, bbox.height));
  if (aspectRatio > 3) return null;

  return {
    shape: {
      type: "circle",
      cx: centerX,
      cy: centerY,
      rx: bbox.width / 2,
      ry: bbox.height / 2,
    },
    confidence: circularity,
  };
};

const tryRecognizeTriangle = (points: DrawPoint[]): ShapeRecognitionResult | null => {
  if (points.length < MIN_POINTS_FOR_RECOGNITION) return null;

  const resampled = resamplePoints(points, 60);
  const windowSize = Math.max(3, Math.floor(resampled.length / 15));
  const angles = computeCornerAngles(resampled, windowSize);
  const corners = findCorners(angles, 55, Math.floor(resampled.length / 6));

  if (corners.length !== 3) return null;

  const cornerPoints = corners.map(i => resampled[Math.min(i + Math.floor(windowSize / 2), resampled.length - 1)]);
  const bbox = computeBoundingBox(points);
  const diagonal = Math.hypot(bbox.width, bbox.height);

  if (diagonal < 10) return null;

  let angleSum = 0;
  for (let i = 0; i < 3; i++) {
    const prev = cornerPoints[(i + 2) % 3];
    const curr = cornerPoints[i];
    const next = cornerPoints[(i + 1) % 3];

    const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
    const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
    let angleDiff = Math.abs(angle2 - angle1);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    angleSum += (angleDiff * 180) / Math.PI;
  }

  const angleError = Math.abs(angleSum - 180);
  if (angleError > 60) return null;

  const confidence = 1 - Math.min(1, angleError / 60);

  return {
    shape: {
      type: "triangle",
      p1: cornerPoints[0],
      p2: cornerPoints[1],
      p3: cornerPoints[2],
    },
    confidence,
  };
};

const tryRecognizeLine = (points: DrawPoint[]): ShapeRecognitionResult | null => {
  if (points.length < 3) return null;

  const linearity = computeLinearity(points);
  if (linearity < LINEARITY_THRESHOLD) return null;

  const start = points[0];
  const end = points[points.length - 1];
  const length = Math.hypot(end.x - start.x, end.y - start.y);

  if (length < 10) return null;

  return {
    shape: {
      type: "line",
      start: { x: start.x, y: start.y },
      end: { x: end.x, y: end.y },
    },
    confidence: linearity,
  };
};

export const recognizeShape = (points: DrawPoint[]): ShapeRecognitionResult | null => {
  if (points.length < 3) return null;

  const lineResult = tryRecognizeLine(points);
  if (lineResult && lineResult.confidence > 0.95) {
    return lineResult;
  }

  const closed = isClosed(points);

  if (!closed) {
    return lineResult;
  }

  const circleResult = tryRecognizeCircle(points);
  const rectangleResult = tryRecognizeRectangle(points);
  const triangleResult = tryRecognizeTriangle(points);

  const candidates: ShapeRecognitionResult[] = [
    circleResult,
    rectangleResult,
    triangleResult,
  ].filter((r): r is ShapeRecognitionResult => r !== null);

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates[0];
};
