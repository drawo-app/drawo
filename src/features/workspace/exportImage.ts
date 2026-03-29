import type {
  CircleElement,
  DrawElement,
  LineElement,
  RectangleElement,
  SceneElement,
  TextElement,
} from "@core/elements";
import {
  getTextLineHeight,
  getTextRunFont,
  measureTextLineWidth,
  parseRichText,
} from "@core/elements";
import type { Scene } from "@core/scene";
import { getLineSelectionBounds } from "@features/canvas/geometry/elementGeometry";
import { getShapeTextAnchorX } from "@features/canvas/geometry/geometry";
import { invertLightnessPreservingHue } from "@features/canvas/rendering/color";
import {
  drawMarkerStroke,
  drawQuillStroke,
  drawRoundedRect,
  drawSmoothStrokePath,
  getDrawLineCap,
  getDrawRenderStyle,
  getVisibleStrokeWidth,
} from "@features/canvas/rendering/drawing";
import { renderLineElement } from "@features/canvas/rendering/lineRendering";

export type ExportImageFormat = "png" | "jpg" | "svg" | "pdf";

export interface ExportImageOptions {
  scene: Scene;
  format: ExportImageFormat;
  qualityScale: number;
  transparentBackground: boolean;
  padding: number;
  systemPrefersDark: boolean;
}

const MAX_EXPORT_EDGE_PX = 12288;
const MAX_EXPORT_PIXELS = 56_000_000;

const getSelectedIds = (scene: Scene): string[] => {
  if (scene.selectedIds.length > 0) {
    return scene.selectedIds;
  }

  return scene.selectedId ? [scene.selectedId] : [];
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const createTimestampLabel = (): string => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours(),
  )}${pad(now.getMinutes())}`;
};

const getSafeElementOpacity = (element: SceneElement): number => {
  const value = (element as { opacity?: number }).opacity;

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 100;
  }

  return clamp(value, 0, 100);
};

const getIsDarkMode = (scene: Scene, systemPrefersDark: boolean): boolean => {
  return (
    scene.settings.theme === "dark" ||
    (scene.settings.theme === "system" && systemPrefersDark)
  );
};

const createThemeColorResolver = (
  scene: Scene,
  systemPrefersDark: boolean,
): ((color: string | null | undefined) => string) => {
  const isDarkMode = getIsDarkMode(scene, systemPrefersDark);
  const shouldInvertColors = isDarkMode && scene.settings.colorScheme === "drawo";

  return (color: string | null | undefined) => {
    const safeColor =
      typeof color === "string" && color.trim().length > 0
        ? color
        : scene.settings.shapeDefaults.textColor;

    if (!shouldInvertColors) {
      return safeColor;
    }

    return invertLightnessPreservingHue(safeColor);
  };
};

const getAlignedStartX = (
  x: number,
  width: number,
  textAlign: CanvasTextAlign,
): number => {
  if (textAlign === "center") {
    return x - width / 2;
  }

  if (textAlign === "right" || textAlign === "end") {
    return x - width;
  }

  return x;
};

const measureRichTextLayout = (
  ctx: CanvasRenderingContext2D,
  value: string,
  style: Pick<TextElement, "fontFamily" | "fontSize" | "fontWeight" | "fontStyle">,
) => {
  const lines = parseRichText(value);
  const lineWidths = lines.map((line) => measureTextLineWidth(ctx, style, line));
  const width = Math.max(16, ...lineWidths);
  const lineHeight = getTextLineHeight(style.fontSize);
  const height = style.fontSize + (lines.length - 1) * lineHeight;

  return { lines, lineWidths, width, height, lineHeight };
};

const drawRichText = (
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  style: Pick<
    TextElement,
    "fontFamily" | "fontSize" | "fontWeight" | "fontStyle" | "textAlign"
  >,
) => {
  const layout = measureRichTextLayout(ctx, value, style);

  layout.lines.forEach((line, lineIndex) => {
    const lineWidth = layout.lineWidths[lineIndex] ?? 0;
    let cursorX = getAlignedStartX(x, lineWidth, style.textAlign);
    const baselineY = y + lineIndex * layout.lineHeight;

    for (const run of line.runs) {
      if (!run.text) {
        continue;
      }

      ctx.font = getTextRunFont(style, run);
      const runWidth = ctx.measureText(run.text).width;
      ctx.fillText(run.text, cursorX, baselineY);

      if (run.strikethrough) {
        const prevStrokeStyle = ctx.strokeStyle;
        const prevLineWidth = ctx.lineWidth;

        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = Math.max(style.fontSize * 0.04, 0.75);

        const strikeY = baselineY - style.fontSize * 0.3;
        ctx.beginPath();
        ctx.moveTo(cursorX, strikeY);
        ctx.lineTo(cursorX + runWidth, strikeY);
        ctx.stroke();

        ctx.strokeStyle = prevStrokeStyle;
        ctx.lineWidth = prevLineWidth;
      }

      cursorX += runWidth;
    }
  });

  return layout;
};

const drawRichTextCentered = (
  ctx: CanvasRenderingContext2D,
  value: string,
  anchorX: number,
  centerY: number,
  style: Pick<
    TextElement,
    "fontFamily" | "fontSize" | "fontWeight" | "fontStyle" | "textAlign"
  >,
) => {
  const layout = measureRichTextLayout(ctx, value, style);
  const topY = centerY - layout.height / 2;

  layout.lines.forEach((line, lineIndex) => {
    const lineWidth = layout.lineWidths[lineIndex] ?? 0;
    let cursorX = getAlignedStartX(anchorX, lineWidth, style.textAlign);
    const baselineY = topY + style.fontSize + lineIndex * layout.lineHeight;

    for (const run of line.runs) {
      if (!run.text) {
        continue;
      }

      ctx.font = getTextRunFont(style, run);
      const runWidth = ctx.measureText(run.text).width;
      ctx.fillText(run.text, cursorX, baselineY);

      if (run.strikethrough) {
        const prevStrokeStyle = ctx.strokeStyle;
        const prevLineWidth = ctx.lineWidth;

        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = Math.max(style.fontSize * 0.04, 0.75);

        const strikeY = baselineY - style.fontSize * 0.3;
        ctx.beginPath();
        ctx.moveTo(cursorX, strikeY);
        ctx.lineTo(cursorX + runWidth, strikeY);
        ctx.stroke();

        ctx.strokeStyle = prevStrokeStyle;
        ctx.lineWidth = prevLineWidth;
      }

      cursorX += runWidth;
    }
  });

  return layout;
};

const getDrawSelectionBounds = (
  element: DrawElement,
): { x: number; y: number; width: number; height: number } => {
  const padding =
    element.drawMode === "marker"
      ? Math.max(6, element.strokeWidth * 0.65)
      : element.drawMode === "quill"
        ? Math.max(4, element.strokeWidth * 1.45)
        : Math.max(3, element.strokeWidth / 2);

  return {
    x: element.x - padding,
    y: element.y - padding,
    width: element.width + padding * 2,
    height: element.height + padding * 2,
  };
};

const rotateBounds = (
  bounds: { x: number; y: number; width: number; height: number },
  rotation: number,
): { x: number; y: number; width: number; height: number } => {
  if (!rotation) {
    return bounds;
  }

  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  const corners = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height },
  ].map((point) => {
    const dx = point.x - centerX;
    const dy = point.y - centerY;

    return {
      x: centerX + dx * cos - dy * sin,
      y: centerY + dx * sin + dy * cos,
    };
  });

  const minX = Math.min(...corners.map((corner) => corner.x));
  const minY = Math.min(...corners.map((corner) => corner.y));
  const maxX = Math.max(...corners.map((corner) => corner.x));
  const maxY = Math.max(...corners.map((corner) => corner.y));

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
};

const getElementBounds = (
  element: SceneElement,
  ctx: CanvasRenderingContext2D,
): { x: number; y: number; width: number; height: number } => {
  if (
    element.type === "rectangle" ||
    element.type === "circle" ||
    element.type === "image"
  ) {
    return rotateBounds(
      {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
      },
      element.rotation,
    );
  }

  if (element.type === "draw") {
    return rotateBounds(getDrawSelectionBounds(element), element.rotation);
  }

  if (element.type === "line") {
    return rotateBounds(getLineSelectionBounds(element), element.rotation);
  }

  const metrics = measureRichTextLayout(ctx, element.text, {
    fontFamily: element.fontFamily,
    fontSize: element.fontSize,
    fontWeight: element.fontWeight,
    fontStyle: element.fontStyle,
  });
  const x = getAlignedStartX(element.x, metrics.width, element.textAlign);

  return rotateBounds(
    {
      x,
      y: element.y - element.fontSize,
      width: metrics.width,
      height: metrics.height,
    },
    element.rotation,
  );
};

const drawShapePath = (
  ctx: CanvasRenderingContext2D,
  element: RectangleElement | CircleElement,
  rectangleRadius: number,
) => {
  if (element.type === "circle") {
    ctx.beginPath();
    ctx.ellipse(
      element.x + element.width / 2,
      element.y + element.height / 2,
      element.width / 2,
      element.height / 2,
      0,
      0,
      Math.PI * 2,
    );
    return;
  }

  drawRoundedRect(
    ctx,
    element.x,
    element.y,
    element.width,
    element.height,
    rectangleRadius,
  );
};

const fillShape = (
  ctx: CanvasRenderingContext2D,
  element: RectangleElement | CircleElement,
  rectangleRadius: number,
  resolveColor: (color: string | null | undefined) => string,
) => {
  if (element.fillStyle === "none") {
    return;
  }

  const fillColor = resolveColor(element.fill);

  ctx.save();
  if (element.fillStyle === "solid") {
    ctx.fillStyle = fillColor;
    drawShapePath(ctx, element, rectangleRadius);
    ctx.fill();
    ctx.restore();
    return;
  }

  const spacing = 8;
  const lineWidth = Math.max(1, element.strokeWidth);
  const hatchSpan =
    Math.hypot(element.width, element.height) +
    Math.max(element.width, element.height) * 2;

  drawShapePath(ctx, element, rectangleRadius);
  ctx.clip();
  ctx.strokeStyle = fillColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (
    let offset = element.x - hatchSpan;
    offset <= element.x + element.width + hatchSpan;
    offset += spacing
  ) {
    ctx.beginPath();
    ctx.moveTo(offset, element.y + element.height + hatchSpan);
    ctx.lineTo(offset + hatchSpan, element.y - hatchSpan);
    ctx.stroke();
  }

  ctx.restore();
};

const strokeShapeOutline = (
  ctx: CanvasRenderingContext2D,
  element: RectangleElement | CircleElement,
  rectangleRadius: number,
  resolveColor: (color: string | null | undefined) => string,
) => {
  if (element.strokeStyle === "none") {
    return;
  }

  ctx.save();
  ctx.strokeStyle = resolveColor(element.stroke);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(1, element.strokeWidth);

  if (element.strokeStyle === "dashed") {
    ctx.setLineDash([8, 4]);
  } else {
    ctx.setLineDash([]);
  }

  drawShapePath(ctx, element, rectangleRadius);
  ctx.stroke();
  ctx.restore();
};

const buildImageCache = async (
  elements: SceneElement[],
): Promise<Map<string, HTMLImageElement>> => {
  const srcList = elements
    .filter((element): element is SceneElement & { type: "image" } => element.type === "image")
    .map((element) => element.src)
    .filter((src) => typeof src === "string" && src.length > 0);

  const uniqueSrc = Array.from(new Set(srcList));
  const cache = new Map<string, HTMLImageElement>();

  await Promise.all(
    uniqueSrc.map(
      (src) =>
        new Promise<void>((resolve) => {
          const image = new window.Image();
          image.decoding = "async";
          image.onload = () => {
            cache.set(src, image);
            resolve();
          };
          image.onerror = () => resolve();
          image.src = src;
        }),
    ),
  );

  return cache;
};

const renderElementsToCanvas = (
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  elements: SceneElement[],
  imageCache: Map<string, HTMLImageElement>,
  toThemeColor: (color: string | null | undefined) => string,
  isDarkMode: boolean,
) => {
  for (const element of elements) {
    const rotationRadians = (element.rotation * Math.PI) / 180;
    const elementOpacity = getSafeElementOpacity(element) / 100;

    if (element.type === "draw") {
      const drawMode = element.drawMode ?? "draw";
      const bounds = {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
      };
      const center = {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      };

      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate(rotationRadians);
      ctx.translate(-center.x, -center.y);
      ctx.translate(element.x, element.y);

      if (element.points.length > 0) {
        const renderStyle = getDrawRenderStyle(drawMode, isDarkMode);
        const prevComposite = ctx.globalCompositeOperation;
        const prevAlpha = ctx.globalAlpha;

        ctx.globalCompositeOperation = renderStyle.compositeOperation;
        ctx.globalAlpha *= renderStyle.opacity * elementOpacity;

        const visibleStrokeWidth = getVisibleStrokeWidth(element.strokeWidth);
        ctx.strokeStyle = toThemeColor(element.stroke);
        ctx.fillStyle = toThemeColor(element.stroke);
        ctx.lineWidth = visibleStrokeWidth;
        ctx.lineJoin = "round";
        ctx.lineCap = getDrawLineCap();

        if (element.points.length === 1) {
          if (drawMode === "marker") {
            drawMarkerStroke(ctx, element.points, visibleStrokeWidth);
          } else if (drawMode === "quill") {
            drawQuillStroke(
              ctx,
              element.points,
              visibleStrokeWidth,
              scene.settings.quillDrawOptimizations,
            );
          } else {
            ctx.beginPath();
            ctx.arc(
              element.points[0].x,
              element.points[0].y,
              ctx.lineWidth / 2,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        } else if (drawMode === "marker") {
          drawMarkerStroke(ctx, element.points, visibleStrokeWidth);
        } else if (drawMode === "quill") {
          drawQuillStroke(
            ctx,
            element.points,
            visibleStrokeWidth,
            scene.settings.quillDrawOptimizations,
          );
        } else {
          ctx.beginPath();
          drawSmoothStrokePath(ctx, element.points);
          ctx.stroke();
        }

        ctx.globalCompositeOperation = prevComposite;
        ctx.globalAlpha = prevAlpha;
      }

      ctx.restore();
      continue;
    }

    if (element.type === "image") {
      const bounds = {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
      };
      const center = {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      };
      const image = element.src ? imageCache.get(element.src) ?? null : null;
      const cornerRadius = Math.min(16, Math.min(element.width, element.height) / 6);

      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate(rotationRadians);
      ctx.translate(-center.x, -center.y);

      const previousAlpha = ctx.globalAlpha;
      ctx.globalAlpha *= elementOpacity;

      if (element.flipX || element.flipY) {
        ctx.translate(center.x, center.y);
        ctx.scale(element.flipX ? -1 : 1, element.flipY ? -1 : 1);
        ctx.translate(-center.x, -center.y);
      }

      ctx.shadowColor = "rgba(15, 23, 42, 0.14)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = toThemeColor(scene.settings.shapeDefaults.fill);
      drawRoundedRect(ctx, element.x, element.y, element.width, element.height, cornerRadius);
      ctx.fill();

      ctx.save();
      drawRoundedRect(ctx, element.x, element.y, element.width, element.height, cornerRadius);
      ctx.clip();

      if (image && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
        ctx.drawImage(image, element.x, element.y, element.width, element.height);
      } else {
        ctx.fillStyle = toThemeColor("#e6e7e8");
        ctx.fillRect(element.x, element.y, element.width, element.height);
      }

      ctx.restore();
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = toThemeColor("rgba(15, 23, 42, 0.08)");
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, element.x, element.y, element.width, element.height, cornerRadius);
      ctx.stroke();
      ctx.globalAlpha = previousAlpha;

      ctx.restore();
      continue;
    }

    if (element.type === "rectangle" || element.type === "circle") {
      const bounds = {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
      };
      const center = {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      };
      const rectangleRadius =
        element.type === "rectangle"
          ? Math.max(0, Math.min(element.borderRadius, Math.min(element.width, element.height) / 2))
          : 0;

      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate(rotationRadians);
      ctx.translate(-center.x, -center.y);

      const previousAlpha = ctx.globalAlpha;
      ctx.globalAlpha *= elementOpacity;

      fillShape(ctx, element, rectangleRadius, toThemeColor);
      strokeShapeOutline(ctx, element, rectangleRadius, toThemeColor);

      if (element.text.trim().length > 0) {
        const textStyle = {
          fontFamily: element.fontFamily,
          fontSize: element.fontSize,
          fontWeight: element.fontWeight,
          fontStyle: element.fontStyle,
          textAlign: element.textAlign,
        } as const;

        ctx.save();
        if (element.type === "circle") {
          ctx.beginPath();
          ctx.ellipse(
            element.x + element.width / 2,
            element.y + element.height / 2,
            element.width / 2,
            element.height / 2,
            0,
            0,
            Math.PI * 2,
          );
          ctx.clip();
        } else {
          drawRoundedRect(
            ctx,
            element.x,
            element.y,
            element.width,
            element.height,
            rectangleRadius,
          );
          ctx.clip();
        }

        ctx.fillStyle = toThemeColor(element.color);
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        drawRichTextCentered(
          ctx,
          element.text,
          getShapeTextAnchorX(element, element.textAlign),
          element.y + element.height / 2,
          textStyle,
        );
        ctx.restore();
      }

      ctx.globalAlpha = previousAlpha;
      ctx.restore();
      continue;
    }

    if (element.type === "line") {
      renderLineElement({
        ctx,
        lineElement: element as LineElement,
        elementOpacity,
        zoom: 1,
        accentColor: "#7c5cff",
        accentSelectionColor: "rgba(124, 92, 255, 0.45)",
        toThemeColor: (value: string) => toThemeColor(value),
        shouldShowElementSelection: false,
        isMultiSelection: false,
        isMarqueePreview: false,
        canTransformSelection: false,
        hoveredLineHandle: null,
        activeLineHandle: null,
        hoveredLinePointIndex: null,
        activeLinePointIndex: null,
      });
      continue;
    }

    const metrics = measureRichTextLayout(ctx, element.text, {
      fontFamily: element.fontFamily,
      fontSize: element.fontSize,
      fontWeight: element.fontWeight,
      fontStyle: element.fontStyle,
    });
    const textWidth = metrics.width;
    const textBounds = {
      x: getAlignedStartX(element.x, textWidth, element.textAlign),
      y: element.y - element.fontSize,
      width: textWidth,
      height: metrics.height,
    };
    const textCenter = {
      x: textBounds.x + textBounds.width / 2,
      y: textBounds.y + textBounds.height / 2,
    };

    ctx.save();
    ctx.translate(textCenter.x, textCenter.y);
    ctx.rotate(rotationRadians);
    ctx.translate(-textCenter.x, -textCenter.y);

    const previousAlpha = ctx.globalAlpha;
    ctx.globalAlpha *= elementOpacity;

    ctx.fillStyle = toThemeColor(element.color);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    drawRichText(ctx, element.text, element.x, element.y, {
      fontFamily: element.fontFamily,
      fontSize: element.fontSize,
      fontWeight: element.fontWeight,
      fontStyle: element.fontStyle,
      textAlign: element.textAlign,
    });

    ctx.globalAlpha = previousAlpha;
    ctx.restore();
  }
};

const canvasToBlob = async (
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("export-canvas-blob-failed"));
          return;
        }

        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
};

const buildSvgWithEmbeddedImage = (
  pngDataUrl: string,
  width: number,
  height: number,
  background: string | null,
): string => {
  const backgroundMarkup = background
    ? `<rect x="0" y="0" width="100%" height="100%" fill="${background}" />`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${backgroundMarkup}<image href="${pngDataUrl}" width="${width}" height="${height}" preserveAspectRatio="none"/></svg>`;
};

export const exportSceneAsImage = async ({
  scene,
  format,
  qualityScale,
  transparentBackground,
  padding,
  systemPrefersDark,
}: ExportImageOptions): Promise<void> => {
  const selectedIds = getSelectedIds(scene);
  const selectedIdSet = new Set(selectedIds);
  const selectedElements =
    selectedIds.length > 0
      ? scene.elements.filter((element) => selectedIdSet.has(element.id))
      : [];
  const sourceElements =
    selectedElements.length > 0 ? selectedElements : scene.elements;

  if (sourceElements.length === 0) {
    throw new Error("no-elements-to-export");
  }

  const measurementCanvas = document.createElement("canvas");
  measurementCanvas.width = 1;
  measurementCanvas.height = 1;
  const measurementCtx = measurementCanvas.getContext("2d");

  if (!measurementCtx) {
    throw new Error("measurement-context-unavailable");
  }

  const boundsList = sourceElements.map((element) => getElementBounds(element, measurementCtx));
  const minX = Math.min(...boundsList.map((bounds) => bounds.x));
  const minY = Math.min(...boundsList.map((bounds) => bounds.y));
  const maxX = Math.max(...boundsList.map((bounds) => bounds.x + bounds.width));
  const maxY = Math.max(...boundsList.map((bounds) => bounds.y + bounds.height));

  const safePadding = clamp(padding, 0, 256);
  const worldX = minX - safePadding;
  const worldY = minY - safePadding;
  const worldWidth = Math.max(1, maxX - minX + safePadding * 2);
  const worldHeight = Math.max(1, maxY - minY + safePadding * 2);

  let scale = clamp(qualityScale, 1, 4);
  const edgeScaleLimit = Math.min(
    MAX_EXPORT_EDGE_PX / worldWidth,
    MAX_EXPORT_EDGE_PX / worldHeight,
  );

  if (edgeScaleLimit < scale) {
    scale = edgeScaleLimit;
  }

  const pixelScaleLimit = Math.sqrt(MAX_EXPORT_PIXELS / (worldWidth * worldHeight));
  if (pixelScaleLimit < scale) {
    scale = pixelScaleLimit;
  }

  scale = clamp(scale, 0.25, 4);

  const width = Math.max(1, Math.ceil(worldWidth * scale));
  const height = Math.max(1, Math.ceil(worldHeight * scale));

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = width;
  exportCanvas.height = height;

  const ctx = exportCanvas.getContext("2d");

  if (!ctx) {
    throw new Error("export-context-unavailable");
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const resolvedTransparentBackground =
    format === "jpg" ? false : transparentBackground;

  if (!resolvedTransparentBackground) {
    ctx.fillStyle = scene.settings.drawDefaults.canvas;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.setTransform(scale, 0, 0, scale, -worldX * scale, -worldY * scale);

  const imageCache = await buildImageCache(sourceElements);
  const toThemeColor = createThemeColorResolver(scene, systemPrefersDark);
  const isDarkMode = getIsDarkMode(scene, systemPrefersDark);

  renderElementsToCanvas(
    ctx,
    scene,
    sourceElements,
    imageCache,
    toThemeColor,
    isDarkMode,
  );

  const timestamp = createTimestampLabel();
  const baseName = `export-${timestamp}`;

  if (format === "png") {
    const blob = await canvasToBlob(exportCanvas, "image/png");
    downloadBlob(blob, `${baseName}.png`);
    return;
  }

  if (format === "jpg") {
    const jpegQuality = clamp(qualityScale / 4, 0.55, 0.95);
    const blob = await canvasToBlob(exportCanvas, "image/jpeg", jpegQuality);
    downloadBlob(blob, `${baseName}.jpg`);
    return;
  }

  if (format === "svg") {
    const pngDataUrl = exportCanvas.toDataURL("image/png");
    const svg = buildSvgWithEmbeddedImage(
      pngDataUrl,
      width,
      height,
      resolvedTransparentBackground ? null : scene.settings.drawDefaults.canvas,
    );
    const blob = new Blob([svg], {
      type: "image/svg+xml;charset=utf-8",
    });
    downloadBlob(blob, `${baseName}.svg`);
    return;
  }

  const { jsPDF } = await import("jspdf");
  const imageDataUrl = exportCanvas.toDataURL(
    resolvedTransparentBackground ? "image/png" : "image/jpeg",
    0.92,
  );

  const pdf = new jsPDF({
    orientation: width >= height ? "landscape" : "portrait",
    unit: "px",
    format: [width, height],
    compress: true,
  });

  pdf.addImage(
    imageDataUrl,
    resolvedTransparentBackground ? "PNG" : "JPEG",
    0,
    0,
    width,
    height,
    undefined,
    "FAST",
  );

  const pdfBlob = pdf.output("blob");
  downloadBlob(pdfBlob, `${baseName}.pdf`);
};
