import type { LineCap, LineElement } from "../core/elements";
import { HANDLE_SIZE } from "./constants";
import {
  getLineCurveControlPoint,
  getLinePoints,
  getLineSelectionBounds,
} from "./elementGeometry";

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

interface RenderLineElementOptions {
  ctx: CanvasRenderingContext2D;
  lineElement: LineElement;
  zoom: number;
  accentColor: string;
  accentSelectionColor: string;
  toThemeColor: (color: string) => string;
  shouldShowElementSelection: boolean;
  isMultiSelection: boolean;
  isMarqueePreview: boolean;
  canTransformSelection: boolean;
  hoveredLineHandle: "start" | "end" | "control" | null;
  activeLineHandle: "start" | "end" | "control" | null;
}

export const renderLineElement = ({
  ctx,
  lineElement,
  zoom,
  accentColor,
  accentSelectionColor,
  toThemeColor,
  shouldShowElementSelection,
  isMultiSelection,
  isMarqueePreview,
  canTransformSelection,
  hoveredLineHandle,
  activeLineHandle,
}: RenderLineElementOptions) => {
  const { start, end, throughPoint } = getLinePoints(lineElement);
  const curveControl = getLineCurveControlPoint(start, end, throughPoint);
  const hasControlPoint = Boolean(lineElement.controlPoint);
  const capSize = Math.max(10, lineElement.strokeWidth * 1.9);
  const selectionBounds = getLineSelectionBounds(lineElement);
  const centerX = start.x + lineElement.width / 2;
  const centerY = start.y + lineElement.height / 2;

  const drawArrowCap = (x: number, y: number, angle: number, isEnd: boolean) => {
    const capLength = capSize * 1.12;
    const capHalfWidth = capSize * 0.66;
    const outlineWidth = Math.max(1.1, lineElement.strokeWidth * 0.22);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(isEnd ? angle : angle + Math.PI);
    ctx.fillStyle = toThemeColor(lineElement.stroke);
    ctx.strokeStyle = toThemeColor(lineElement.stroke);
    ctx.lineWidth = outlineWidth;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(capLength, 0);
    ctx.lineTo(capLength * 0.04, -capHalfWidth);
    ctx.lineTo(capLength * 0.04, capHalfWidth);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  const drawLineArrowCap = (
    x: number,
    y: number,
    angle: number,
    isEnd: boolean,
  ) => {
    const capLength = capSize * 0.92;
    const capHalfWidth = capSize * 0.56;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(isEnd ? angle : angle + Math.PI);
    ctx.strokeStyle = toThemeColor(lineElement.stroke);
    ctx.lineWidth = Math.max(2, lineElement.strokeWidth);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-capLength, -capHalfWidth);
    ctx.lineTo(0, 0);
    ctx.lineTo(-capLength, capHalfWidth);
    ctx.stroke();
    ctx.restore();
  };

  const drawInvertedTriangleCap = (
    x: number,
    y: number,
    angle: number,
    isEnd: boolean,
  ) => {
    const capLength = capSize * 1.08;
    const capHalfWidth = capSize * 0.64;
    const outlineWidth = Math.max(1.1, lineElement.strokeWidth * 0.22);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(isEnd ? angle : angle + Math.PI);
    ctx.fillStyle = toThemeColor(lineElement.stroke);
    ctx.strokeStyle = toThemeColor(lineElement.stroke);
    ctx.lineWidth = outlineWidth;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(capLength, -capHalfWidth);
    ctx.lineTo(capLength, capHalfWidth);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  const drawCircularArrowCap = (
    x: number,
    y: number,
    angle: number,
    isEnd: boolean,
  ) => {
    const radius = capSize * 0.62;
    ctx.beginPath();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(isEnd ? angle : angle + Math.PI);
    ctx.fillStyle = toThemeColor(lineElement.stroke);
    ctx.arc(radius, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const drawDiamondCap = (
    x: number,
    y: number,
    angle: number,
    isEnd: boolean,
  ) => {
    const capLength = capSize * 1.3;
    const capHalfWidth = capSize * 0.6;
    const outlineWidth = Math.max(1.1, lineElement.strokeWidth * 0.22);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(isEnd ? angle : angle + Math.PI);
    ctx.fillStyle = toThemeColor(lineElement.stroke);
    ctx.strokeStyle = toThemeColor(lineElement.stroke);
    ctx.lineWidth = outlineWidth;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(capLength * 0.5, -capHalfWidth);
    ctx.lineTo(capLength, 0);
    ctx.lineTo(capLength * 0.5, capHalfWidth);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  const startTangent = hasControlPoint
    ? { x: curveControl.x - start.x, y: curveControl.y - start.y }
    : { x: end.x - start.x, y: end.y - start.y };
  const endTangent = hasControlPoint
    ? { x: end.x - curveControl.x, y: end.y - curveControl.y }
    : { x: end.x - start.x, y: end.y - start.y };
  const startAngle = Math.atan2(startTangent.y, startTangent.x);
  const endAngle = Math.atan2(endTangent.y, endTangent.x);

  ctx.save();
  if (lineElement.rotation !== 0) {
    ctx.translate(centerX, centerY);
    ctx.rotate((lineElement.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
  }

  ctx.strokeStyle = toThemeColor(lineElement.stroke);
  ctx.lineWidth = lineElement.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  if (hasControlPoint) {
    ctx.quadraticCurveTo(curveControl.x, curveControl.y, end.x, end.y);
  } else {
    ctx.lineTo(end.x, end.y);
  }
  ctx.stroke();

  const renderLineCap = (
    cap: LineCap,
    x: number,
    y: number,
    angle: number,
    isEnd: boolean,
  ) => {
    if (cap === "none") {
      return;
    }
    if (cap === "line arrow") {
      drawLineArrowCap(x, y, angle, isEnd);
      return;
    }
    if (cap === "triangle arrow") {
      drawArrowCap(x, y, angle, isEnd);
      return;
    }
    if (cap === "inverted triangle") {
      drawInvertedTriangleCap(x, y, angle, isEnd);
      return;
    }
    if (cap === "circular arrow") {
      drawCircularArrowCap(x, y, angle, isEnd);
      return;
    }
    drawDiamondCap(x, y, angle, isEnd);
  };

  renderLineCap(lineElement.startCap, start.x, start.y, startAngle, false);
  renderLineCap(lineElement.endCap, end.x, end.y, endAngle, true);

  if (shouldShowElementSelection) {
    if (isMultiSelection) {
      ctx.strokeStyle = accentSelectionColor;
      ctx.lineWidth = 1 / zoom;
      ctx.strokeRect(
        selectionBounds.x,
        selectionBounds.y,
        selectionBounds.width,
        selectionBounds.height,
      );
    } else if (canTransformSelection) {
      drawLineEditHandles(
        ctx,
        lineElement,
        zoom,
        accentColor,
        toThemeColor("#F4F5F4"),
        hoveredLineHandle,
        activeLineHandle,
      );
    }
  } else if (isMarqueePreview) {
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1 / zoom;
    ctx.strokeRect(
      selectionBounds.x,
      selectionBounds.y,
      selectionBounds.width,
      selectionBounds.height,
    );
  }

  ctx.restore();
};
