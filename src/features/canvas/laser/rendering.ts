import { clamp01 } from "../color";
import {
  LASER_BASE_WIDTH_PX,
  LASER_COLOR,
  LASER_LIFETIME_MS,
  LASER_MIN_WIDTH_PX,
} from "./constants";
import type { LaserTrailPoint } from "./types";

/**
 * Converts point age into a width attenuation factor.
 *
 * The easing exponent makes the trail stay visible near the head, then taper
 * faster near the end for a cleaner laser look.
 */
const getLaserWidthFactor = (ageMs: number): number => {
  const normalized = clamp01(1 - ageMs / LASER_LIFETIME_MS);
  return Math.pow(normalized, 1.3);
};

/**
 * Draws one laser trail using Catmull-Rom interpolation.
 *
 * A segment-by-segment stroke is used instead of one large path so each sample
 * can have its own width based on age.
 */
export const drawLaserTrail = (
  ctx: CanvasRenderingContext2D,
  points: LaserTrailPoint[],
  now: number,
  camera: { zoom: number },
) => {
  if (points.length < 2) {
    return;
  }

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = LASER_COLOR;

  const resolution = 5;
  let firstPoint = true;

  for (let index = 0; index < points.length - 1; index++) {
    const p0 = points[index === 0 ? 0 : index - 1];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] || points[index + 1];

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
      const widthFactor = getLaserWidthFactor(now - pointT);
      const widthPx = Math.max(LASER_MIN_WIDTH_PX, LASER_BASE_WIDTH_PX * widthFactor);

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
