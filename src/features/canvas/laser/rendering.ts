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

interface LaserSample {
  x: number;
  y: number;
  widthPx: number;
}

interface LaserSampleSet {
  samples: LaserSample[];
  maxWidthPx: number;
  avgWidthPx: number;
}

const isFirefoxRuntime =
  typeof navigator !== "undefined" && /firefox/i.test(navigator.userAgent);

const sampleLaserTrail = (
  points: LaserTrailPoint[],
  now: number,
  settings: LaserSettings,
): LaserSampleSet => {
  const resolution = 3;
  const samples: LaserSample[] = [];
  let widthSum = 0;
  let maxWidthPx = 0;

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
        settings.baseWidth * widthFactor,
      );

      if (widthPx <= settings.minWidth + 0.01) {
        continue;
      }

      const previous = samples[samples.length - 1];
      if (previous && previous.x === x && previous.y === y) {
        continue;
      }

      samples.push({ x, y, widthPx });
      widthSum += widthPx;
      maxWidthPx = Math.max(maxWidthPx, widthPx);
    }
  }

  return {
    samples,
    maxWidthPx,
    avgWidthPx:
      samples.length > 0 ? widthSum / samples.length : settings.minWidth,
  };
};

const buildLaserPath = (samples: LaserSample[]): Path2D => {
  const path = new Path2D();
  path.moveTo(samples[0].x, samples[0].y);

  for (let index = 1; index < samples.length; index++) {
    const sample = samples[index];
    path.lineTo(sample.x, sample.y);
  }

  return path;
};

const drawBlurGlowPass = (
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  camera: { zoom: number },
  pass: {
    strokeColor: string;
    shadowColor: string;
    widthPx: number;
    shadowBlurPx: number;
  },
) => {
  ctx.strokeStyle = pass.strokeColor;
  ctx.lineWidth = pass.widthPx / camera.zoom;
  ctx.shadowColor = pass.shadowColor;
  ctx.shadowBlur = pass.shadowBlurPx / camera.zoom;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.stroke(path);
};

const drawCorePass = (
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  camera: { zoom: number },
  color: string,
  widthPx: number,
) => {
  ctx.shadowBlur = 0;
  ctx.shadowColor = "rgba(0, 0, 0, 0)";
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = color;
  ctx.lineWidth = widthPx / camera.zoom;
  ctx.stroke(path);
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

  const { samples, maxWidthPx, avgWidthPx } = sampleLaserTrail(
    points,
    now,
    settings,
  );
  if (samples.length < 2) {
    return;
  }

  const path = buildLaserPath(samples);

  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (settings.shadow) {
    // Key insight: shadowBlur intensity scales with the drawn stroke area.
    // Use full-width strokes so the gaussian has enough "ink" to cast a big halo.
    // The core pass draws on top afterwards covering these glow strokes cleanly.
    const corePx = Math.max(settings.minWidth, avgWidthPx);

    if (isFirefoxRuntime) {
      // Firefox: single pass, moderate blur to preserve FPS
      drawBlurGlowPass(ctx, path, camera, {
        strokeColor: withAlpha(settings.color, 1.0),
        shadowColor: withAlpha(settings.color, 1.0),
        widthPx: corePx,
        shadowBlurPx: Math.max(18, maxWidthPx * 2.5),
      });
    } else {
      // Chromium: three passes – outer mega-halo, mid glow, tight inner corona
      drawBlurGlowPass(ctx, path, camera, {
        strokeColor: withAlpha(settings.color, 1.0),
        shadowColor: withAlpha(settings.color, 0.75),
        widthPx: corePx,
        shadowBlurPx: Math.max(60, maxWidthPx * 7),
      });
      drawBlurGlowPass(ctx, path, camera, {
        strokeColor: withAlpha(settings.color, 1.0),
        shadowColor: withAlpha(settings.color, 0.9),
        widthPx: corePx,
        shadowBlurPx: Math.max(30, maxWidthPx * 3.5),
      });
      drawBlurGlowPass(ctx, path, camera, {
        strokeColor: withAlpha(settings.color, 1.0),
        shadowColor: "rgba(255, 255, 255, 0.55)",
        widthPx: corePx,
        shadowBlurPx: Math.max(12, maxWidthPx * 1.2),
      });
    }
  }

  drawCorePass(
    ctx,
    path,
    camera,
    settings.color,
    Math.max(settings.minWidth, avgWidthPx),
  );
};
