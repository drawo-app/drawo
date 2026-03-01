import { clamp01 } from "./color";
import {
  LASER_BASE_WIDTH_PX,
  LASER_LIFETIME_MS,
  LASER_MIN_WIDTH_PX,
} from "./constants";
import type { LaserTrail } from "./types";

export const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const limitedRadius = Math.max(0, Math.min(radius, width / 2, height / 2));

  ctx.beginPath();
  ctx.moveTo(x + limitedRadius, y);
  ctx.lineTo(x + width - limitedRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + limitedRadius);
  ctx.lineTo(x + width, y + height - limitedRadius);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - limitedRadius,
    y + height,
  );
  ctx.lineTo(x + limitedRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - limitedRadius);
  ctx.lineTo(x, y + limitedRadius);
  ctx.quadraticCurveTo(x, y, x + limitedRadius, y);
  ctx.closePath();
};

export const drawSmoothStrokePath = (
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
) => {
  if (points.length === 0) {
    return;
  }

  if (points.length === 1) {
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[0].x, points[0].y);
    return;
  }

  if (points.length === 2) {
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    return;
  }

  ctx.moveTo(points[0].x, points[0].y);

  for (let index = 1; index < points.length - 1; index++) {
    const current = points[index];
    const next = points[index + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    ctx.quadraticCurveTo(current.x, current.y, midX, midY);
  }

  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
};

export const drawMarkerStroke = (
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  strokeWidth: number,
) => {
  if (points.length === 0) {
    return;
  }

  const width = Math.max(1, strokeWidth);
  const halfWidth = width / 2;
  const cornerRadius = Math.max(1, width * 0.25);
  const capLength = halfWidth;

  const drawLeftRoundedRect = (w: number, h: number, r: number) => {
    const y = -h / 2;
    ctx.moveTo(0, y);
    ctx.lineTo(-w + r, y);
    ctx.quadraticCurveTo(-w, y, -w, y + r);
    ctx.lineTo(-w, y + h - r);
    ctx.quadraticCurveTo(-w, y + h, -w + r, y + h);
    ctx.lineTo(0, y + h);
    ctx.lineTo(0, y);
  };

  const drawRightRoundedRect = (w: number, h: number, r: number) => {
    const y = -h / 2;
    ctx.moveTo(0, y);
    ctx.lineTo(w - r, y);
    ctx.quadraticCurveTo(w, y, w, y + r);
    ctx.lineTo(w, y + h - r);
    ctx.quadraticCurveTo(w, y + h, w - r, y + h);
    ctx.lineTo(0, y + h);
    ctx.lineTo(0, y);
  };

  ctx.beginPath();

  if (points.length === 1) {
    const point = points[0];
    const dabSize = width;
    const r = cornerRadius;
    const x = point.x - dabSize / 2;
    const y = point.y - dabSize / 2;

    ctx.moveTo(x + r, y);
    ctx.lineTo(x + dabSize - r, y);
    ctx.quadraticCurveTo(x + dabSize, y, x + dabSize, y + r);
    ctx.lineTo(x + dabSize, y + dabSize - r);
    ctx.quadraticCurveTo(x + dabSize, y + dabSize, x + dabSize - r, y + dabSize);
    ctx.lineTo(x + r, y + dabSize);
    ctx.quadraticCurveTo(x, y + dabSize, x, y + dabSize - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.fill("nonzero");
    return;
  }

  const firstPt = points[0];
  const secondPt = points[1];
  const firstAngle = Math.atan2(secondPt.y - firstPt.y, secondPt.x - firstPt.x);
  ctx.save();
  ctx.translate(firstPt.x, firstPt.y);
  ctx.rotate(firstAngle);
  drawLeftRoundedRect(capLength, width, cornerRadius);
  ctx.restore();

  for (let index = 1; index < points.length; index++) {
    const start = points[index - 1];
    const end = points[index];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const segmentLength = Math.hypot(dx, dy);

    if (segmentLength <= 0.001) {
      continue;
    }

    const angle = Math.atan2(dy, dx);
    ctx.save();
    ctx.translate(start.x, start.y);
    ctx.rotate(angle);
    ctx.rect(0, -halfWidth, segmentLength, width);
    ctx.restore();
  }

  for (let index = 1; index < points.length - 1; index++) {
    const point = points[index];
    ctx.moveTo(point.x + halfWidth, point.y);
    ctx.arc(point.x, point.y, halfWidth, 0, Math.PI * 2);
  }

  const lastPt = points[points.length - 1];
  const prevPt = points[points.length - 2];
  const lastAngle = Math.atan2(lastPt.y - prevPt.y, lastPt.x - prevPt.x);
  ctx.save();
  ctx.translate(lastPt.x, lastPt.y);
  ctx.rotate(lastAngle);
  drawRightRoundedRect(capLength, width, cornerRadius);
  ctx.restore();

  ctx.fill("nonzero");
};

export const getVisibleStrokeWidth = (strokeWidth: number): number => {
  const safeStrokeWidth =
    typeof strokeWidth === "number" && Number.isFinite(strokeWidth)
      ? Math.max(1, strokeWidth)
      : 2;

  return safeStrokeWidth;
};

export const getDrawRenderStyle = (
  drawMode: "draw" | "marker",
  isDarkMode: boolean,
): { opacity: number; compositeOperation: GlobalCompositeOperation } => {
  if (drawMode === "marker") {
    return {
      opacity: isDarkMode ? 0.42 : 0.32,
      compositeOperation: isDarkMode ? "screen" : "multiply",
    };
  }

  return {
    opacity: 1,
    compositeOperation: "source-over",
  };
};

export const getDrawLineCap = (
  drawMode: "draw" | "marker",
): CanvasLineCap => {
  return drawMode === "marker" ? "butt" : "round";
};

export const getAnimatedDrawPointCount = (
  totalPoints: number,
  createdAt: number | undefined,
  nowMs: number,
  revealDurationMs: number,
): number => {
  if (!createdAt || totalPoints <= 2) {
    return totalPoints;
  }

  const elapsed = Math.max(0, nowMs - createdAt);
  if (elapsed >= revealDurationMs) {
    return totalPoints;
  }

  const progress = Math.min(1, elapsed / revealDurationMs);
  const eased = 1 - Math.pow(1 - progress, 3);
  return Math.max(2, Math.ceil(totalPoints * eased));
};

const getLaserWidthFactor = (ageMs: number): number => {
  const normalized = clamp01(1 - ageMs / LASER_LIFETIME_MS);
  return Math.pow(normalized, 1.3);
};

export const drawCatmullRomCurve = (
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number; t: number }>,
  laserNow: number,
  camera: { zoom: number },
) => {
  if (points.length < 2) {
    return;
  }

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "#ff1424";

  const resolution = 5;
  let firstPoint = true;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || points[i + 1];

    for (let t = 0; t <= 1; t += 1 / resolution) {
      const t2 = t * t;
      const t3 = t2 * t;

      const v0 = (p2.x - p0.x) * 0.5;
      const v1 = (p3.x - p1.x) * 0.5;
      const x =
        p1.x +
        v0 * t +
        (3 * (p2.x - p1.x) - 2 * v0 - v1) * t2 +
        (2 * (p1.x - p2.x) + v0 + v1) * t3;

      const v0y = (p2.y - p0.y) * 0.5;
      const v1y = (p3.y - p1.y) * 0.5;
      const y =
        p1.y +
        v0y * t +
        (3 * (p2.y - p1.y) - 2 * v0y - v1y) * t2 +
        (2 * (p1.y - p2.y) + v0y + v1y) * t3;

      const pointT = p1.t + (p2.t - p1.t) * t;
      const widthFactor = getLaserWidthFactor(laserNow - pointT);
      const widthPx = Math.max(
        LASER_MIN_WIDTH_PX,
        LASER_BASE_WIDTH_PX * widthFactor,
      );

      if (widthPx > LASER_MIN_WIDTH_PX + 0.01) {
        if (firstPoint) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineWidth = widthPx / camera.zoom;
          ctx.lineTo(x, y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x, y);
        }
      }
    }
  }
};

export const pruneLaserTrails = (
  trails: LaserTrail[],
  now: number,
): LaserTrail[] => {
  return trails
    .map((trail) => ({
      ...trail,
      points: trail.points.filter(
        (point) => now - point.t <= LASER_LIFETIME_MS,
      ),
    }))
    .filter((trail) => trail.points.length > 0);
};
