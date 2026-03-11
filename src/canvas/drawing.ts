import { clamp01 } from "./color";
import {
  LASER_BASE_WIDTH_PX,
  LASER_LIFETIME_MS,
  LASER_MIN_WIDTH_PX,
} from "./constants";
import type { LaserTrail } from "./types";

type StrokePoint = { x: number; y: number; t?: number };

const quillStrokeCache = new WeakMap<
  ReadonlyArray<StrokePoint>,
  {
    strokeWidth: number;
    smoothedPoints: StrokePoint[];
    widths: number[];
    rasterStrokeStyle: string | null;
    rasterCanvas: HTMLCanvasElement | null;
    rasterX: number;
    rasterY: number;
    rasterWidth: number;
    rasterHeight: number;
  }
>();

let markerOffscreenCanvas: HTMLCanvasElement | null = null;

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
  points: ReadonlyArray<{ x: number; y: number }>,
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

/**
 * Draws a rounded-rectangle cap at the tip of a marker stroke.
 *
 * After translate(px,py) + rotate(outwardAngle):
 *   +X = outward direction (away from stroke body)
 *   +Y = perpendicular (cap width)
 *
 * The inner edge is flush with the stroke endpoint (x=0), perfectly flat.
 * Only the two outer corners (at x=extend) are rounded.
 *
 *   (0, -half) ←─── inner edge ───→ (0, +half)
 *         ↓                                ↓
 *   (extend, -half+r) ←─ outer ─→ (extend, +half-r)
 *               └── only these two corners are rounded ──┘
 */
const drawMarkerRoundedRectCap = (
  offCtx: CanvasRenderingContext2D,
  px: number,
  py: number,
  outwardAngle: number,
  strokeWidth: number,
) => {
  const half = strokeWidth / 2;
  // How far the cap protrudes past the stroke endpoint (~30 % of half-width).
  const extend = half * 0.3;
  // Radius for the two outer corners only.
  const cornerR = Math.min(half * 0.25, extend * 0.8);

  offCtx.save();
  offCtx.translate(px, py);
  offCtx.rotate(outwardAngle);

  offCtx.beginPath();
  offCtx.moveTo(0, -half); // inner top
  offCtx.lineTo(extend - cornerR, -half); // outer top before corner
  offCtx.quadraticCurveTo(extend, -half, extend, -half + cornerR); // top-outer corner
  offCtx.lineTo(extend, half - cornerR); // outer bottom before corner
  offCtx.quadraticCurveTo(extend, half, extend - cornerR, half); // bottom-outer corner
  offCtx.lineTo(0, half); // inner bottom
  offCtx.closePath();
  offCtx.fill();

  offCtx.restore();
};

export const drawMarkerStroke = (
  ctx: CanvasRenderingContext2D,
  points: ReadonlyArray<{ x: number; y: number }>,
  strokeWidth: number,
) => {
  if (points.length === 0) {
    return;
  }
  const width = Math.max(1, strokeWidth);

  // Draw into an offscreen canvas so the body + both caps form a single
  // opaque shape before it is composited (multiply / screen) onto the main
  // canvas.  Without this, drawing the cap on top of the already-blended
  // stroke body would produce a brighter/darker band at each end.
  const mainCanvas = ctx.canvas;
  if (
    !markerOffscreenCanvas ||
    markerOffscreenCanvas.width !== mainCanvas.width ||
    markerOffscreenCanvas.height !== mainCanvas.height
  ) {
    markerOffscreenCanvas = document.createElement("canvas");
    markerOffscreenCanvas.width = mainCanvas.width;
    markerOffscreenCanvas.height = mainCanvas.height;
  }

  const offscreen = markerOffscreenCanvas;
  const offCtx = offscreen.getContext("2d");
  if (!offCtx) {
    return;
  }

  offCtx.setTransform(1, 0, 0, 1, 0, 0);
  offCtx.clearRect(0, 0, offscreen.width, offscreen.height);

  // Replicate the full transform (camera zoom + element rotation).
  offCtx.setTransform(ctx.getTransform());
  offCtx.strokeStyle = ctx.strokeStyle;
  offCtx.fillStyle = ctx.strokeStyle;

  if (points.length === 1) {
    // Single point → small circle whose diameter equals the stroke width.
    offCtx.beginPath();
    offCtx.arc(points[0].x, points[0].y, width / 2, 0, Math.PI * 2);
    offCtx.fill();
  } else {
    // ── Stroke body (lineCap "butt" = flat, exact endpoints) ──────────────
    offCtx.lineWidth = width;
    offCtx.lineJoin = "round";
    offCtx.lineCap = "butt";
    offCtx.beginPath();
    drawSmoothStrokePath(offCtx, points);
    offCtx.stroke();

    // ── Start cap ──────────────────────────────────────────────────────────
    const sDx = points[0].x - points[1].x;
    const sDy = points[0].y - points[1].y;
    const sLen = Math.sqrt(sDx * sDx + sDy * sDy);
    if (sLen > 0) {
      drawMarkerRoundedRectCap(
        offCtx,
        points[0].x,
        points[0].y,
        Math.atan2(sDy, sDx),
        width,
      );
    }

    // ── End cap ────────────────────────────────────────────────────────────
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    const eDx = last.x - prev.x;
    const eDy = last.y - prev.y;
    const eLen = Math.sqrt(eDx * eDx + eDy * eDy);
    if (eLen > 0) {
      drawMarkerRoundedRectCap(
        offCtx,
        last.x,
        last.y,
        Math.atan2(eDy, eDx),
        width,
      );
    }
  }

  // Blit the completed offscreen shape onto the main canvas.
  // The caller has already set globalCompositeOperation / globalAlpha,
  // so the whole stroke is composited in one shot — no double-blending.
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(offscreen, 0, 0);
  ctx.restore();
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const lerp = (from: number, to: number, t: number): number => {
  return from + (to - from) * t;
};

const getPointTime = (
  point: { x: number; y: number; t?: number },
  fallback: number,
): number => {
  return typeof point.t === "number" && Number.isFinite(point.t)
    ? point.t
    : fallback;
};

const smoothQuillPoints = (
  points: ReadonlyArray<StrokePoint>,
): StrokePoint[] => {
  if (points.length <= 2) {
    return [...points];
  }

  let current: StrokePoint[] = [...points];

  for (let iteration = 0; iteration < 2; iteration++) {
    if (current.length <= 2) {
      break;
    }

    const next: Array<{ x: number; y: number; t?: number }> = [current[0]];

    for (let index = 0; index < current.length - 1; index++) {
      const start = current[index];
      const end = current[index + 1];

      next.push({
        x: start.x * 0.75 + end.x * 0.25,
        y: start.y * 0.75 + end.y * 0.25,
        t:
          typeof start.t === "number" && typeof end.t === "number"
            ? start.t * 0.75 + end.t * 0.25
            : start.t,
      });

      next.push({
        x: start.x * 0.25 + end.x * 0.75,
        y: start.y * 0.25 + end.y * 0.75,
        t:
          typeof start.t === "number" && typeof end.t === "number"
            ? start.t * 0.25 + end.t * 0.75
            : end.t,
      });
    }

    next.push(current[current.length - 1]);
    current = next;
  }

  return current;
};

const getQuillWidths = (
  points: ReadonlyArray<StrokePoint>,
  baseStrokeWidth: number,
): number[] => {
  if (points.length === 0) {
    return [];
  }

  const safeBase = Math.max(1, baseStrokeWidth);
  const minWidth = safeBase * 0.42;
  const maxWidth = safeBase * 2.35;
  const slowSpeed = 0.035;
  const fastSpeed = 0.9;

  let smoothedFactor = 1.3;
  const widths: number[] = [
    clamp(safeBase * smoothedFactor, minWidth, maxWidth),
  ];
  let smoothedSpeed = 0;

  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1];
    const current = points[index];

    const distance = Math.hypot(current.x - previous.x, current.y - previous.y);
    const previousTime = getPointTime(previous, (index - 1) * 16);
    const currentTime = getPointTime(current, index * 16);
    const deltaTime = Math.max(1, currentTime - previousTime);
    const speed = distance / deltaTime;
    smoothedSpeed = lerp(smoothedSpeed, speed, 0.12);
    const normalizedSpeed = clamp01(
      (smoothedSpeed - slowSpeed) / (fastSpeed - slowSpeed),
    );

    const targetFactor = lerp(2.3, 0.42, normalizedSpeed);
    smoothedFactor = lerp(smoothedFactor, targetFactor, 0.12);

    widths.push(clamp(safeBase * smoothedFactor, minWidth, maxWidth));
  }

  for (let pass = 0; pass < 2; pass++) {
    for (let index = 1; index < widths.length - 1; index++) {
      widths[index] =
        widths[index - 1] * 0.25 +
        widths[index] * 0.5 +
        widths[index + 1] * 0.25;
    }
  }

  return widths;
};

const drawQuillStrokeSegments = (
  ctx: CanvasRenderingContext2D,
  smoothedPoints: ReadonlyArray<StrokePoint>,
  widths: ReadonlyArray<number>,
  baseAlpha: number,
) => {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (smoothedPoints.length === 1) {
    ctx.globalAlpha = baseAlpha;
    ctx.beginPath();
    ctx.arc(
      smoothedPoints[0].x,
      smoothedPoints[0].y,
      widths[0] / 2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    return;
  }

  for (let index = 1; index < smoothedPoints.length; index++) {
    const start = smoothedPoints[index - 1];
    const end = smoothedPoints[index];
    const startWidth = widths[index - 1] ?? widths[0];
    const endWidth = widths[index] ?? startWidth;
    const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);
    const stepCount = Math.max(1, Math.ceil(segmentLength / 2.4));

    for (let step = 1; step <= stepCount; step++) {
      const t0 = (step - 1) / stepCount;
      const t1 = step / stepCount;
      const x0 = lerp(start.x, end.x, t0);
      const y0 = lerp(start.y, end.y, t0);
      const x1 = lerp(start.x, end.x, t1);
      const y1 = lerp(start.y, end.y, t1);
      const width = lerp(startWidth, endWidth, (t0 + t1) / 2);
      const textureAlpha = 0.985 + 0.015 * Math.sin(index * 9.7 + step * 0.31);

      ctx.globalAlpha = baseAlpha * textureAlpha;
      ctx.lineWidth = Math.max(0.6, width);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  }
};

const getQuillRasterBounds = (
  smoothedPoints: ReadonlyArray<StrokePoint>,
  widths: ReadonlyArray<number>,
) => {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < smoothedPoints.length; index++) {
    const point = smoothedPoints[index];
    const halfWidth = (widths[index] ?? widths[0] ?? 1) / 2 + 2;
    minX = Math.min(minX, point.x - halfWidth);
    minY = Math.min(minY, point.y - halfWidth);
    maxX = Math.max(maxX, point.x + halfWidth);
    maxY = Math.max(maxY, point.y + halfWidth);
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
};

export const drawQuillStroke = (
  ctx: CanvasRenderingContext2D,
  points: ReadonlyArray<StrokePoint>,
  strokeWidth: number,
) => {
  if (points.length === 0) {
    return;
  }

  const safeStrokeWidth = Math.max(1, strokeWidth);
  const cached = quillStrokeCache.get(points);
  const smoothedPoints =
    cached && cached.strokeWidth === safeStrokeWidth
      ? cached.smoothedPoints
      : smoothQuillPoints(points);
  const widths =
    cached && cached.strokeWidth === safeStrokeWidth
      ? cached.widths
      : getQuillWidths(smoothedPoints, safeStrokeWidth);

  if (!cached || cached.strokeWidth !== safeStrokeWidth) {
    quillStrokeCache.set(points, {
      strokeWidth: safeStrokeWidth,
      smoothedPoints,
      widths,
      rasterStrokeStyle: null,
      rasterCanvas: null,
      rasterX: 0,
      rasterY: 0,
      rasterWidth: 0,
      rasterHeight: 0,
    });
  }
  if (widths.length === 0) {
    return;
  }

  const cacheEntry = quillStrokeCache.get(points);
  const originalAlpha = ctx.globalAlpha;
  const strokeStyle =
    typeof ctx.strokeStyle === "string" ? ctx.strokeStyle : null;

  if (
    cacheEntry &&
    strokeStyle &&
    cacheEntry.rasterCanvas &&
    cacheEntry.rasterStrokeStyle === strokeStyle
  ) {
    ctx.drawImage(
      cacheEntry.rasterCanvas,
      cacheEntry.rasterX,
      cacheEntry.rasterY,
      cacheEntry.rasterWidth,
      cacheEntry.rasterHeight,
    );
    ctx.globalAlpha = originalAlpha;
    return;
  }

  if (cacheEntry && strokeStyle) {
    const rasterBounds = getQuillRasterBounds(smoothedPoints, widths);
    const rasterScale = 2;
    const rasterCanvas = document.createElement("canvas");
    rasterCanvas.width = Math.max(1, Math.ceil(rasterBounds.width * rasterScale));
    rasterCanvas.height = Math.max(
      1,
      Math.ceil(rasterBounds.height * rasterScale),
    );

    const rasterCtx = rasterCanvas.getContext("2d");
    if (rasterCtx) {
      rasterCtx.setTransform(rasterScale, 0, 0, rasterScale, 0, 0);
      rasterCtx.translate(-rasterBounds.x, -rasterBounds.y);
      rasterCtx.strokeStyle = strokeStyle;
      rasterCtx.fillStyle = strokeStyle;
      drawQuillStrokeSegments(rasterCtx, smoothedPoints, widths, 1);

      cacheEntry.rasterStrokeStyle = strokeStyle;
      cacheEntry.rasterCanvas = rasterCanvas;
      cacheEntry.rasterX = rasterBounds.x;
      cacheEntry.rasterY = rasterBounds.y;
      cacheEntry.rasterWidth = rasterBounds.width;
      cacheEntry.rasterHeight = rasterBounds.height;

      ctx.drawImage(
        rasterCanvas,
        rasterBounds.x,
        rasterBounds.y,
        rasterBounds.width,
        rasterBounds.height,
      );
      ctx.globalAlpha = originalAlpha;
      return;
    }
  }

  drawQuillStrokeSegments(ctx, smoothedPoints, widths, originalAlpha);
  ctx.globalAlpha = originalAlpha;
};

export const getVisibleStrokeWidth = (strokeWidth: number): number => {
  const safeStrokeWidth =
    typeof strokeWidth === "number" && Number.isFinite(strokeWidth)
      ? Math.max(1, strokeWidth)
      : 2;

  return safeStrokeWidth;
};

export const getDrawRenderStyle = (
  drawMode: "draw" | "marker" | "quill",
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

export const getDrawLineCap = (): CanvasLineCap => {
  return "round";
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
