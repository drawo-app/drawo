import type { LineElement } from "../core/elements";
import { HANDLE_SIZE } from "./constants";
import { getLinePoints } from "./elementGeometry";

export const drawLineEditHandles = (
  ctx: CanvasRenderingContext2D,
  line: LineElement,
  zoom: number,
  accentColor: string,
  surfaceColor: string,
  hoveredHandle: "start" | "end" | "control" | null,
  activeHandle: "start" | "end" | "control" | null,
) => {
  const { start, end, throughPoint } = getLinePoints(line);
  const handles: Array<{
    key: "start" | "end" | "control";
    x: number;
    y: number;
  }> = [
    { key: "start", x: start.x, y: start.y },
    { key: "end", x: end.x, y: end.y },
    { key: "control", x: throughPoint.x, y: throughPoint.y },
  ];

  const baseRadius = Math.max(6 / zoom, HANDLE_SIZE / (2.6 * zoom));

  for (const handle of handles) {
    const isHovered = hoveredHandle === handle.key;
    const isActive = activeHandle === handle.key;
    const scale = isActive ? 1.3 : isHovered ? 1.15 : 1;
    const radius = baseRadius * scale;

    ctx.save();
    ctx.fillStyle = surfaceColor;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = (isActive ? 2.25 : isHovered ? 1.8 : 1.5) / zoom;
    ctx.beginPath();
    ctx.arc(handle.x, handle.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (isActive || isHovered) {
      ctx.globalAlpha = isActive ? 0.2 : 0.12;
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 5 / zoom;
      ctx.beginPath();
      ctx.arc(handle.x, handle.y, radius + 1.5 / zoom, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
};
