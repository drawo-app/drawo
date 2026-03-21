import { clamp01, parseColor } from "../rendering/color";
import type { LaserTrailPoint } from "./types";

export interface LaserSettings {
  lifetime: number;
  baseWidth: number;
  minWidth: number;
  shadow: boolean;
  color: string;
}

const getLaserWidthFactor = (ageMs: number, lifetime: number): number => {
  const normalized = clamp01(1 - ageMs / lifetime);
  return Math.pow(normalized, 1.3);
};

const withAlpha = (color: string, alphaMultiplier: number) => {
  const parsed = parseColor(color);
  if (!parsed) {
    return color;
  }

  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${clamp01(parsed.a * alphaMultiplier)})`;
};

const renderLaserPass = (
  ctx: CanvasRenderingContext2D,
  points: LaserTrailPoint[],
  now: number,
  camera: { zoom: number },
  settings: LaserSettings,
  pass: {
    widthMultiplier: number;
    strokeColor: string;
    shadowColor: string;
    shadowBlurPx: number;
  },
) => {
  ctx.strokeStyle = pass.strokeColor;
  ctx.shadowColor = pass.shadowColor;
  ctx.shadowBlur = pass.shadowBlurPx / camera.zoom;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

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
      const widthFactor = getLaserWidthFactor(now - pointT, settings.lifetime);
      const widthPx = Math.max(
        settings.minWidth,
        settings.baseWidth * widthFactor * pass.widthMultiplier,
      );

      if (widthPx > settings.minWidth + 0.01) {
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

export const drawLaserTrail = (
  ctx: CanvasRenderingContext2D,
  points: LaserTrailPoint[],
  now: number,
  camera: { zoom: number },
  settings: LaserSettings,
) => {
  if (points.length < 2) {
    return;
  }

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (settings.shadow) {
    renderLaserPass(ctx, points, now, camera, settings, {
      widthMultiplier: 2.8,
      strokeColor: withAlpha(settings.color, 0.2),
      shadowColor: withAlpha(settings.color, 0.8),
      shadowBlurPx: 28,
    });

    renderLaserPass(ctx, points, now, camera, settings, {
      widthMultiplier: 1.85,
      strokeColor: withAlpha(settings.color, 0.35),
      shadowColor: withAlpha(settings.color, 0.95),
      shadowBlurPx: 14,
    });
  }

  renderLaserPass(ctx, points, now, camera, settings, {
    widthMultiplier: 1,
    strokeColor: settings.color,
    shadowColor: "rgba(0, 0, 0, 0)",
    shadowBlurPx: 0,
  });
};
