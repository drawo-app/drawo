import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import type { DrawElementStyle, FlipAxis } from "@core/scene";
import {
  estimateTextHeight,
  estimateTextWidth,
  getTextFont,
  getTextLineHeight,
  getTextRunFont,
  hitTestRectangle,
  measureTextLineWidth,
  parseRichText,
} from "@core/elements";
import { findHitElement } from "@core/hitTest";
import type {
  CircleElement,
  ImageElement,
  RectangleElement,
  TextElement,
  LineElement,
  SceneElement,
} from "@core/elements";
import { createEditor, Editor, Transforms, type Descendant } from "slate";
import { ReactEditor, withReact } from "slate-react";
import { withHistory } from "slate-history";
import {
  HANDLE_BORDER_RADIUS_PX,
  HANDLE_SIZE,
  MIN_GRID_SCREEN_SPACING,
  RADIUS_HANDLE_OFFSET_PX,
  RADIUS_HANDLE_SIZE_PX,
  TEXT_SELECTION_PADDING_PX,
  SHAPE_TEXT_HORIZONTAL_PADDING_PX,
} from "@features/canvas/rendering/constants";
import {
  invertLightnessPreservingHue,
  normalizeRgbTriplet,
} from "@features/canvas/rendering/color";
import {
  drawQuillStroke,
  getDrawLineCap,
  getDrawRenderStyle,
  drawMarkerStroke,
  drawRoundedRect,
  drawSmoothStrokePath,
  getVisibleStrokeWidth,
} from "@features/canvas/rendering/drawing";
import {
  type CornerAction,
  findCornerAction,
  getAlignedStartX,
  getBoundsCenter,
  getHandleCenter,
  getResizeCursor,
  getRotateCursor,
  getShapeTextAnchorX,
  rotatePointAroundCenter,
} from "@features/canvas/geometry/geometry";
import {
  getDrawSelectionBounds,
  getLinePoints,
  getLineSelectionBounds,
  toLineLocalPointer,
} from "@features/canvas/geometry/elementGeometry";
import { renderLineElement } from "@features/canvas/rendering/lineRendering";
import {
  deserializeRichTextDocument,
  serializeRichTextDocument,
} from "@features/canvas/text/richTextDocument";
import { CanvasEmptyState } from "@features/canvas/components/CanvasEmptyState";
import { SelectionImageControls } from "@features/canvas/selection/components/SelectionImageControls";
import { SelectionShapeControls } from "@features/canvas/selection/components/SelectionShapeControls";
import { SelectionStrokeControls } from "@features/canvas/selection/components/SelectionStrokeControls";
import { SelectionTextControls } from "@features/canvas/selection/components/SelectionTextControls";
import { SelectionToolbar } from "@features/canvas/selection/components/SelectionToolbar";
import { TextEditorOverlay } from "@features/canvas/text/TextEditorOverlay";
import {
  getSelectedDrawElements,
  getSelectedImageElements,
  getSelectedIds,
  getSelectedShapeElements,
  getSelectedTextElements,
} from "@features/canvas/selection/selectionState";
import type {
  CanvasViewProps,
  DrawSelection,
  DrawingSelection,
  EditableElement,
  EditingTextState,
  ElementBounds,
  MarqueeSelection,
  ResizeHandle,
  RichTextDocument,
} from "@features/canvas/types";
import type { SmartGuide } from "@features/canvas/selection/alignmentGuides";
import {
  LASER_COLOR,
  drawLaserTrail,
  useLaserTrails,
} from "@features/canvas/laser";
import {
  CanvasContextMenu,
  type CanvasContextMenuSelectionType,
} from "@features/canvas/components/CanvasContextMenu";

const getCurrentTimestamp = () => performance.now();
type ShapeElement = RectangleElement | CircleElement;
type FlippableSceneElement = Exclude<SceneElement, { type: "text" }>;

interface FlipPreviewItem {
  fromCenterX: number;
  fromCenterY: number;
  toCenterX: number;
  toCenterY: number;
}

interface FlipPreviewState {
  axis: FlipAxis;
  startedAt: number;
  durationMs: number;
  items: Map<string, FlipPreviewItem>;
}

const FLIP_ANIMATION_DURATION_MS = 220;

const isFlippableSceneElement = (
  element: SceneElement,
): element is FlippableSceneElement => {
  return element.type !== "text";
};

const easeInOutCubic = (value: number) => {
  if (value < 0.5) {
    return 4 * value * value * value;
  }

  return 1 - Math.pow(-2 * value + 2, 3) / 2;
};

const lerp = (start: number, end: number, progress: number) => {
  return start + (end - start) * progress;
};

const drawGuideMarker = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  zoom: number,
  color: string,
) => {
  const size = 6 / zoom;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1 / zoom;
  ctx.lineCap = "round";
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x - size / 2, y - size / 2);
  ctx.lineTo(x + size / 2, y + size / 2);
  ctx.moveTo(x + size / 2, y - size / 2);
  ctx.lineTo(x - size / 2, y + size / 2);
  ctx.stroke();
  ctx.restore();
};

const drawSmartGuides = (
  ctx: CanvasRenderingContext2D,
  guides: SmartGuide[],
  zoom: number,
  color: string,
) => {
  if (guides.length === 0) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1 / zoom;
  ctx.setLineDash([6 / zoom, 4 / zoom]);

  for (const guide of guides) {
    ctx.beginPath();

    if (guide.axis === "x") {
      ctx.moveTo(guide.value, guide.start);
      ctx.lineTo(guide.value, guide.end);
    } else {
      ctx.moveTo(guide.start, guide.value);
      ctx.lineTo(guide.end, guide.value);
    }

    ctx.stroke();
    drawGuideMarker(ctx, guide.movingPoint.x, guide.movingPoint.y, zoom, color);
    drawGuideMarker(ctx, guide.targetPoint.x, guide.targetPoint.y, zoom, color);
  }

  ctx.restore();
};

const drawShapePath = (
  ctx: CanvasRenderingContext2D,
  element: ShapeElement,
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
  element: ShapeElement,
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
  element: ShapeElement,
  rectangleRadius: number,
  resolveColor: (color: string | null | undefined) => string,
) => {
  ctx.save();
  ctx.strokeStyle = resolveColor(element.stroke);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(1, element.strokeWidth);
  drawShapePath(ctx, element, rectangleRadius);
  ctx.stroke();

  ctx.restore();
};

export const CanvasView = ({
  scene,
  alignmentGuides,
  interactionMode,
  drawingTool,
  localeMessages,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheelPan,
  onWheelZoom,
  onCreateElement,
  onCreateDrawElement,
  onDrawingToolComplete,
  onDropImageFiles,
  onSelectElements,
  onCopySelection,
  onCutSelection,
  onPasteAt,
  onDuplicateSelection,
  onDeleteSelection,
  onGroupSelection,
  onUngroupSelection,
  onSelectGroupForElement,
  onReorderSelection,
  onFlipSelection,
  onTextFontFamilyChange,
  onTextFontSizeChange,
  onTextFontWeightChange,
  onTextFontStyleChange,
  onTextAlignChange,
  onDrawStrokeWidthChange,
  onDrawStrokeColorChange,
  onShapeFillColorChange,
  onShapeFillStyleChange,
  onShapeStrokeColorChange,
  onShapeStrokeWidthChange,
  onDrawDefaultStrokeColorChange,
  onLineStartCapChange,
  onLineEndCapChange,
  onLineEditStart,
  onLineGeometryChange,
  onRectangleBorderRadiusChange,
  onGroupResizeStart,
  onGroupRotateStart,
  onResizeStart,
  onRotateStart,
  onTextCommit,
}: CanvasViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const focusedEditingTextIdRef = useRef<string | null>(null);
  const [editingText, setEditingText] = useState<EditingTextState | null>(null);
  const [editingDocument, setEditingDocument] =
    useState<RichTextDocument | null>(null);
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [canvasSize, setCanvasSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const [canvasCursor, setCanvasCursor] = useState("default");
  const [activeResizeHandle, setActiveResizeHandle] =
    useState<ResizeHandle | null>(null);
  const [hoveredResizeHandle, setHoveredResizeHandle] =
    useState<ResizeHandle | null>(null);
  const [activeRotatingHandle, setActiveRotatingHandle] =
    useState<ResizeHandle | null>(null);
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [isDuplicateDragging, setIsDuplicateDragging] = useState(false);
  const [marqueeSelection, setMarqueeSelection] =
    useState<MarqueeSelection | null>(null);
  const [marqueePreviewIds, setMarqueePreviewIds] = useState<string[]>([]);
  const [drawingSelection, setDrawingSelection] =
    useState<DrawingSelection | null>(null);
  const [drawSelection, setDrawSelection] = useState<DrawSelection | null>(
    null,
  );
  const fontsLoadedRef = useRef(false);
  const [, setRenderTrigger] = useState(0);
  const [flipPreview, setFlipPreview] = useState<FlipPreviewState | null>(null);
  const {
    laserTrails,
    laserNow,
    startLaserTrail,
    appendLaserPoint,
    clearActiveLaserTrail,
  } = useLaserTrails();
  const customDrawColorPickerWrapRef = useRef<HTMLDivElement>(null);
  const customDrawColorPickerContentRef = useRef<HTMLDivElement>(null);
  const [isCustomDrawColorPickerOpen, setIsCustomDrawColorPickerOpen] =
    useState(false);
  const [isCustomDrawColorPickerOpen2, setIsCustomDrawColorPickerOpen2] =
    useState(false);
  const [customDrawColorPickerColor, setCustomDrawColorPickerColor] =
    useState<string>("#2f3b52");
  const [activeSelectId, setActiveSelectId] = useState<string | null>(null);
  const [activeRadiusElementId, setActiveRadiusElementId] = useState<
    string | null
  >(null);
  const [activeRadiusHandle, setActiveRadiusHandle] =
    useState<ResizeHandle | null>(null);
  const [hoveredLineHandle, setHoveredLineHandle] = useState<
    "start" | "end" | "control" | null
  >(null);
  const [activeLineHandle, setActiveLineHandle] = useState<
    "start" | "end" | "control" | null
  >(null);
  const getCachedImage = (src: string) => {
    const cachedImage = imageCacheRef.current.get(src);
    if (cachedImage) {
      return cachedImage;
    }

    const image = new window.Image();
    image.decoding = "async";
    image.onload = () => {
      setRenderTrigger((prev) => prev + 1);
    };
    image.onerror = () => {
      setRenderTrigger((prev) => prev + 1);
    };
    image.src = src;
    imageCacheRef.current.set(src, image);
    return image;
  };
  const lineHandleDragRef = useRef<{
    id: string;
    handle: "start" | "end" | "control";
    startLine: {
      x: number;
      y: number;
      width: number;
      height: number;
      controlPoint: { x: number; y: number } | null;
    };
  } | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const contextMenuPointRef = useRef<{ x: number; y: number } | null>(null);
  const panStateRef = useRef<{ screenX: number; screenY: number } | null>(null);
  const isMiddleMousePanningRef = useRef(false);
  const selectedIds = getSelectedIds(scene);
  const hasSelection = selectedIds.length > 0;
  const canTransformSelection = selectedIds.length === 1;
  const selectedElementId = canTransformSelection ? selectedIds[0] : null;
  const selectedElements = scene.elements.filter((element) =>
    selectedIds.includes(element.id),
  );
  const canFlipSelection = selectedElements.some((element) =>
    isFlippableSceneElement(element),
  );
  const selectedElementType: CanvasContextMenuSelectionType =
    selectedIds.length === 1
      ? selectedElements[0]?.type === "draw" ||
        selectedElements[0]?.type === "image"
        ? selectedElements[0].type
        : "multiple"
      : "multiple";
  const canUngroupSelection = selectedElements.some(
    (element) => element.groupId,
  );
  const selectedGroupId =
    selectedElements.length > 0
      ? selectedElements.every(
          (element) =>
            element.groupId && element.groupId === selectedElements[0]?.groupId,
        )
        ? (selectedElements[0]?.groupId ?? null)
        : null
      : null;
  const selectedGroupElementIds = selectedGroupId
    ? scene.elements
        .filter((element) => element.groupId === selectedGroupId)
        .map((element) => element.id)
    : [];
  const isWholeGroupSelected =
    Boolean(selectedGroupId) &&
    selectedGroupElementIds.length > 1 &&
    selectedGroupElementIds.length === selectedIds.length &&
    selectedGroupElementIds.every((id) => selectedIds.includes(id));
  const isSingleElementWithinGroupSelected =
    selectedIds.length === 1 && Boolean(selectedElements[0]?.groupId);
  const camera = scene.camera;
  const isDarkMode = scene.settings.theme === "dark";

  const getActiveDrawStyle = (
    drawMode: "draw" | "marker" | "quill",
  ): DrawElementStyle => {
    const selectedDrawElements = getSelectedDrawElements(
      scene.elements,
      selectedIds,
    ).filter((element) => (element.drawMode ?? "draw") === drawMode);

    if (selectedDrawElements.length === 0) {
      const defaultStroke =
        drawMode === "marker"
          ? scene.settings.drawDefaults.markerStroke
          : drawMode === "quill"
            ? scene.settings.drawDefaults.quillStroke
            : scene.settings.drawDefaults.drawStroke;

      return {
        drawMode,
        stroke: defaultStroke,
        strokeWidth:
          drawMode === "marker"
            ? scene.settings.drawDefaults.markerStrokeWidth
            : drawMode === "quill"
              ? scene.settings.drawDefaults.quillStrokeWidth
              : scene.settings.drawDefaults.drawStrokeWidth,
      };
    }

    const activeStroke = selectedDrawElements[0].stroke;
    const activeStrokeWidth = selectedDrawElements[0].strokeWidth;

    return {
      drawMode,
      stroke:
        typeof activeStroke === "string" && activeStroke.trim().length > 0
          ? activeStroke
          : drawMode === "marker"
            ? scene.settings.drawDefaults.markerStroke
            : drawMode === "quill"
              ? scene.settings.drawDefaults.quillStroke
              : scene.settings.drawDefaults.drawStroke,
      strokeWidth:
        typeof activeStrokeWidth === "number" &&
        Number.isFinite(activeStrokeWidth)
          ? Math.max(1, activeStrokeWidth)
          : drawMode === "marker"
            ? scene.settings.drawDefaults.markerStrokeWidth
            : drawMode === "quill"
              ? scene.settings.drawDefaults.quillStrokeWidth
              : scene.settings.drawDefaults.drawStrokeWidth,
    };
  };

  const toThemeColor = (color: string | null | undefined): string => {
    const safeColor =
      typeof color === "string" && color.trim().length > 0 ? color : "#2f3b52";

    if (!isDarkMode) {
      return safeColor;
    }

    return safeColor.toLowerCase() === "#f4f5f4"
      ? "#101010"
      : invertLightnessPreservingHue(safeColor);
  };

  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      return {
        x: screenX / camera.zoom + camera.x,
        y: screenY / camera.zoom + camera.y,
      };
    },
    [camera.x, camera.y, camera.zoom],
  );

  const worldToScreen = useCallback(
    (worldX: number, worldY: number) => {
      return {
        x: (worldX - camera.x) * camera.zoom,
        y: (worldY - camera.y) * camera.zoom,
      };
    },
    [camera.x, camera.y, camera.zoom],
  );

  const measureRichTextLayout = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      value: string,
      style: Pick<
        TextElement,
        "fontFamily" | "fontSize" | "fontWeight" | "fontStyle"
      >,
    ) => {
      const lines = parseRichText(value);
      const lineWidths = lines.map((line) =>
        measureTextLineWidth(ctx, style, line),
      );
      const maxWidth = Math.max(16, ...lineWidths);
      const lineHeight = getTextLineHeight(style.fontSize);
      const height = style.fontSize + (lines.length - 1) * lineHeight;

      return {
        lines,
        lineWidths,
        width: maxWidth,
        height,
        lineHeight,
      };
    },
    [],
  );

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
      const lineStartX = getAlignedStartX(x, lineWidth, style.textAlign);
      const baselineY = y + lineIndex * layout.lineHeight;
      let cursorX = lineStartX;

      for (const run of line.runs) {
        if (!run.text) {
          continue;
        }

        ctx.font = getTextRunFont(style, run);
        const metrics = ctx.measureText(run.text);
        const runWidth = metrics.width;

        ctx.fillText(run.text, cursorX, baselineY);

        if (run.strikethrough) {
          const previousStrokeStyle = ctx.strokeStyle;
          const previousLineWidth = ctx.lineWidth;

          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = Math.max(style.fontSize * 0.04, 0.75);

          if (run.strikethrough) {
            const strikeY = baselineY - style.fontSize * 0.3;
            ctx.beginPath();
            ctx.moveTo(cursorX, strikeY);
            ctx.lineTo(cursorX + runWidth, strikeY);
            ctx.stroke();
          }

          ctx.strokeStyle = previousStrokeStyle;
          ctx.lineWidth = previousLineWidth;
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
        const metrics = ctx.measureText(run.text);
        const runWidth = metrics.width;

        ctx.fillText(run.text, cursorX, baselineY);

        if (run.strikethrough) {
          const previousStrokeStyle = ctx.strokeStyle;
          const previousLineWidth = ctx.lineWidth;

          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = Math.max(style.fontSize * 0.04, 0.75);

          if (run.strikethrough) {
            const strikeY = baselineY - style.fontSize * 0.3;
            ctx.beginPath();
            ctx.moveTo(cursorX, strikeY);
            ctx.lineTo(cursorX + runWidth, strikeY);
            ctx.stroke();
          }

          ctx.strokeStyle = previousStrokeStyle;
          ctx.lineWidth = previousLineWidth;
        }

        cursorX += runWidth;
      }
    });

    return layout;
  };

  useEffect(() => {
    if (!isCustomDrawColorPickerOpen) {
      return;
    }
    if (!isCustomDrawColorPickerOpen2) {
      return;
    }


    const handlePointerDownOutside = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      if (customDrawColorPickerWrapRef.current?.contains(target)) {
        return;
      }

      if (customDrawColorPickerContentRef.current?.contains(target)) {
        return;
      }

      setIsCustomDrawColorPickerOpen(false);
      setIsCustomDrawColorPickerOpen2(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCustomDrawColorPickerOpen(false);
        setIsCustomDrawColorPickerOpen2(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDownOutside);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDownOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isCustomDrawColorPickerOpen]);

  const getHoveredLineHandle = (
    line: LineElement,
    localPointX: number,
    localPointY: number,
    zoom: number,
  ): "start" | "end" | "control" | null => {
    const { start, end, throughPoint } = getLinePoints(line);
    const hitRadius = Math.max(7 / zoom, HANDLE_SIZE / (2.3 * zoom));

    if (Math.hypot(localPointX - start.x, localPointY - start.y) <= hitRadius) {
      return "start";
    }

    if (Math.hypot(localPointX - end.x, localPointY - end.y) <= hitRadius) {
      return "end";
    }

    if (
      Math.hypot(localPointX - throughPoint.x, localPointY - throughPoint.y) <=
      hitRadius
    ) {
      return "control";
    }

    return null;
  };

  const measureElementBounds = (
    element: SceneElement,
    ctx?: CanvasRenderingContext2D,
    includeTextPadding: boolean = true,
  ): ElementBounds => {
    if (
      element.type === "rectangle" ||
      element.type === "circle" ||
      element.type === "image"
    ) {
      return {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
      };
    }

    if (element.type === "draw") {
      return getDrawSelectionBounds(element);
    }

    if (element.type === "line") {
      return getLineSelectionBounds(element);
    }

    const measuredWidth = ctx
      ? measureRichTextLayout(ctx, element.text, {
          fontFamily: element.fontFamily,
          fontSize: element.fontSize,
          fontWeight: element.fontWeight,
          fontStyle: element.fontStyle,
        }).width
      : Math.max(16, estimateTextWidth(element));
    const startX = getAlignedStartX(
      element.x,
      measuredWidth,
      element.textAlign,
    );
    const textHeight = estimateTextHeight(element);
    const baseBounds = {
      x: startX,
      y: element.y - element.fontSize,
      width: measuredWidth,
      height: textHeight,
    };

    if (!includeTextPadding) {
      return baseBounds;
    }

    const padding = TEXT_SELECTION_PADDING_PX / camera.zoom;

    return {
      x: baseBounds.x - padding,
      y: baseBounds.y - padding,
      width: baseBounds.width + padding * 2,
      height: baseBounds.height + padding * 2,
    };
  };

  const getElementBounds = (
    elementId: string,
    ctx?: CanvasRenderingContext2D,
    includeTextPadding: boolean = true,
  ): ElementBounds | null => {
    const element = scene.elements.find((item) => item.id === elementId);
    if (!element) {
      return null;
    }

    return measureElementBounds(element, ctx, includeTextPadding);
  };

  const drawResizeHandles = (
    ctx: CanvasRenderingContext2D,
    bounds: ElementBounds,
    zoom: number,
    accentColor: string,
  ) => {
    const handleSize = HANDLE_SIZE / zoom;
    const handleRadius = HANDLE_BORDER_RADIUS_PX / zoom;
    const handles: ResizeHandle[] = ["nw", "ne", "se", "sw"];

    for (const handle of handles) {
      const center = getHandleCenter(bounds, handle);

      const isHovered = hoveredResizeHandle === handle;
      const isActive = activeResizeHandle === handle;

      let scale = 1;
      let shadowBlur = 2 / zoom;
      let shadowOpacity = 0.1;
      let strokeWidth = 1 / zoom;

      if (isActive) {
        scale = 1.35;
        shadowBlur = 8 / zoom;
        shadowOpacity = 0.25;
        strokeWidth = 2.5 / zoom;
      } else if (isHovered) {
        scale = 1.2;
        shadowBlur = 5 / zoom;
        shadowOpacity = 0.18;
        strokeWidth = 1.5 / zoom;
      }

      const scaledSize = handleSize * scale;
      const scaledHalf = scaledSize / 2;
      const scaledX = center.x - scaledHalf;
      const scaledY = center.y - scaledHalf;

      ctx.save();

      ctx.shadowColor = `rgba(0, 0, 0, ${shadowOpacity})`;
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1.5 / zoom;

      ctx.fillStyle = isActive ? accentColor : toThemeColor("#F4F5F4");
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = strokeWidth;

      drawRoundedRect(
        ctx,
        scaledX,
        scaledY,
        scaledSize,
        scaledSize,
        handleRadius * scale,
      );
      ctx.fill();
      ctx.stroke();

      if (isHovered || isActive) {
        ctx.strokeStyle = accentColor;
        ctx.globalAlpha = isActive ? 0.15 : 0.08;
        ctx.lineWidth = (4 + (isActive ? 2 : 0)) / zoom;

        drawRoundedRect(
          ctx,
          scaledX,
          scaledY,
          scaledSize,
          scaledSize,
          handleRadius * scale,
        );
        ctx.stroke();

        ctx.globalAlpha = 1;
      }

      if (isHovered || isActive) {
        ctx.fillStyle = isActive
          ? "rgba(255, 255, 255, 0.25)"
          : "rgba(255, 255, 255, 0.15)";
        const insetSize = scaledSize * 0.5;
        ctx.beginPath();
        ctx.arc(center.x, center.y, insetSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  };

  const getSelectionBounds = (
    ids: string[],
    ctx?: CanvasRenderingContext2D,
    includeTextPadding: boolean = true,
  ): ElementBounds | null => {
    if (ids.length === 0) {
      return null;
    }

    const elementBounds = ids
      .map((id) => getElementBounds(id, ctx, includeTextPadding))
      .filter((value): value is ElementBounds => value !== null);

    if (elementBounds.length === 0) {
      return null;
    }

    const minX = Math.min(...elementBounds.map((bounds) => bounds.x));
    const minY = Math.min(...elementBounds.map((bounds) => bounds.y));
    const maxX = Math.max(
      ...elementBounds.map((bounds) => bounds.x + bounds.width),
    );
    const maxY = Math.max(
      ...elementBounds.map((bounds) => bounds.y + bounds.height),
    );

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  };

  const handleFlipSelectionWithAnimation = (axis: FlipAxis) => {
    if (flipPreview) {
      return;
    }

    const previewElements = scene.elements.filter(
      (element): element is FlippableSceneElement =>
        selectedIds.includes(element.id) && isFlippableSceneElement(element),
    );

    if (previewElements.length === 0) {
      return;
    }

    const boundsEntries = previewElements.map((element) => ({
      id: element.id,
      bounds: measureElementBounds(element),
    }));
    const selectionLeft = Math.min(
      ...boundsEntries.map((entry) => entry.bounds.x),
    );
    const selectionTop = Math.min(
      ...boundsEntries.map((entry) => entry.bounds.y),
    );
    const selectionRight = Math.max(
      ...boundsEntries.map((entry) => entry.bounds.x + entry.bounds.width),
    );
    const selectionBottom = Math.max(
      ...boundsEntries.map((entry) => entry.bounds.y + entry.bounds.height),
    );
    const items = new Map<string, FlipPreviewItem>();

    for (const entry of boundsEntries) {
      const center = getBoundsCenter(entry.bounds);
      const nextBoundsX =
        axis === "horizontal"
          ? selectionLeft +
            selectionRight -
            (entry.bounds.x + entry.bounds.width)
          : entry.bounds.x;
      const nextBoundsY =
        axis === "vertical"
          ? selectionTop +
            selectionBottom -
            (entry.bounds.y + entry.bounds.height)
          : entry.bounds.y;

      items.set(entry.id, {
        fromCenterX: center.x,
        fromCenterY: center.y,
        toCenterX: center.x + (nextBoundsX - entry.bounds.x),
        toCenterY: center.y + (nextBoundsY - entry.bounds.y),
      });
    }

    setFlipPreview({
      axis,
      startedAt: getCurrentTimestamp(),
      durationMs: FLIP_ANIMATION_DURATION_MS,
      items,
    });
  };

  useEffect(() => {
    if (!flipPreview) {
      return;
    }

    let frameId = 0;

    const tick = () => {
      const elapsed = getCurrentTimestamp() - flipPreview.startedAt;

      if (elapsed >= flipPreview.durationMs) {
        setFlipPreview(null);
        onFlipSelection(flipPreview.axis);
        return;
      }

      setRenderTrigger((previous) => previous + 1);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [flipPreview, onFlipSelection]);

  const selectionToolbarOverlay = (() => {
    if (selectedIds.length === 0) {
      return null;
    }

    if (
      isDraggingElement ||
      activeResizeHandle ||
      activeRotatingHandle ||
      activeLineHandle
    ) {
      return null;
    }

    const bounds = getSelectionBounds(selectedIds, undefined, true);
    if (!bounds) {
      return null;
    }

    const screenTopLeft = worldToScreen(bounds.x, bounds.y);
    const screenBottomRight = worldToScreen(
      bounds.x + bounds.width,
      bounds.y + bounds.height,
    );

    const centerX = (screenTopLeft.x + screenBottomRight.x) / 2;
    const top = Math.max(
      8,
      Math.min(screenTopLeft.y - 42, canvasSize.height - 46),
    );

    return {
      left: centerX,
      top,
      key: selectedIds.join("|"),
    };
  })();

  const getHoverCornerAction = (
    pointX: number,
    pointY: number,
  ): CornerAction | null => {
    if (editingText) {
      return null;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    if (selectedIds.length > 1) {
      const selectionBounds = getSelectionBounds(selectedIds, ctx, true);
      if (!selectionBounds) {
        return null;
      }

      return findCornerAction(selectionBounds, pointX, pointY, camera.zoom);
    }

    if (!selectedElementId) {
      return null;
    }

    const selectedElement = scene.elements.find(
      (element) => element.id === selectedElementId,
    );

    if (selectedElement?.type === "line") {
      return null;
    }

    if (selectedElement?.type === "text") {
      ctx.font = getTextFont(selectedElement);
    }

    const bounds = getElementBounds(selectedElementId, ctx);
    if (!bounds) {
      return null;
    }

    const rotation = ((selectedElement?.rotation ?? 0) * Math.PI) / 180;
    const center = getBoundsCenter(bounds);
    const localPoint = rotatePointAroundCenter(
      pointX,
      pointY,
      center.x,
      center.y,
      -rotation,
    );

    return findCornerAction(bounds, localPoint.x, localPoint.y, camera.zoom);
  };

  const getRectangleRadiusHandleCenter = (
    bounds: ElementBounds,
    borderRadius: number,
    zoom: number,
    handle: ResizeHandle,
  ) => {
    const maxRadius = Math.min(bounds.width, bounds.height) / 2;
    const radius = Math.max(0, Math.min(borderRadius, maxRadius));
    const inset = radius + RADIUS_HANDLE_OFFSET_PX / zoom;

    if (handle === "nw") {
      return { x: bounds.x + inset, y: bounds.y + inset };
    }
    if (handle === "ne") {
      return { x: bounds.x + bounds.width - inset, y: bounds.y + inset };
    }
    if (handle === "se") {
      return {
        x: bounds.x + bounds.width - inset,
        y: bounds.y + bounds.height - inset,
      };
    }

    return { x: bounds.x + inset, y: bounds.y + bounds.height - inset };
  };

  const getSingleSelectedRectangle = (): RectangleElement | null => {
    if (!selectedElementId) {
      return null;
    }

    const element = scene.elements.find(
      (item) => item.id === selectedElementId,
    );
    if (!element || element.type !== "rectangle") {
      return null;
    }

    return element;
  };

  const getHoveredRectangleRadiusHandle = (
    rectangle: RectangleElement,
    localPointX: number,
    localPointY: number,
    zoom: number,
  ): ResizeHandle | null => {
    const bounds = {
      x: rectangle.x,
      y: rectangle.y,
      width: rectangle.width,
      height: rectangle.height,
    };
    const handles: ResizeHandle[] = ["nw", "ne", "se", "sw"];
    const radius = RADIUS_HANDLE_SIZE_PX / (2 * zoom);

    for (const handle of handles) {
      const center = getRectangleRadiusHandleCenter(
        bounds,
        rectangle.borderRadius,
        zoom,
        handle,
      );

      if (
        Math.hypot(localPointX - center.x, localPointY - center.y) <= radius
      ) {
        return handle;
      }
    }

    return null;
  };

  const renderSelectionBarContents = () => {
    const selectedTextElements = getSelectedTextElements(
      scene.elements,
      selectedIds,
    );
    const hasStandaloneTextSelection = selectedTextElements.some(
      (element) => element.type === "text",
    );

    if (hasStandaloneTextSelection || editingText) {
      return (
        <SelectionTextControls
          scene={scene}
          selectedIds={selectedIds}
          localeMessages={localeMessages}
          editor={editor}
          editingText={editingText}
          setEditingText={setEditingText}
          worldToScreen={worldToScreen}
          toggleEditorMark={toggleEditorMark}
          onTextCommit={onTextCommit}
          onTextFontFamilyChange={onTextFontFamilyChange}
          onTextFontSizeChange={onTextFontSizeChange}
          onTextFontWeightChange={onTextFontWeightChange}
          onTextFontStyleChange={onTextFontStyleChange}
          onTextAlignChange={onTextAlignChange}
          activeSelectId={activeSelectId}
          setActiveSelectId={setActiveSelectId}
        />
      );
    }

    const selectedImageElements = getSelectedImageElements(
      scene.elements,
      selectedIds,
    );
    if (selectedImageElements.length > 0) {
      return <SelectionImageControls />;
    }

    const selectedShapeElements = getSelectedShapeElements(
      scene.elements,
      selectedIds,
    );
    if (selectedShapeElements.length > 0) {
      return (
        <SelectionShapeControls
          scene={scene}
          selectedIds={selectedIds}
          localeMessages={localeMessages}
          customDrawColorPickerWrapRef={customDrawColorPickerWrapRef}
          customDrawColorPickerContentRef={customDrawColorPickerContentRef}
          customDrawColorPickerColor={customDrawColorPickerColor}
          setCustomDrawColorPickerColor={setCustomDrawColorPickerColor}
          setIsCustomDrawColorPickerOpen1={setIsCustomDrawColorPickerOpen}
          isCustomDrawColorPickerOpen1={isCustomDrawColorPickerOpen}
          setIsCustomDrawColorPickerOpen2={setIsCustomDrawColorPickerOpen2}
          isCustomDrawColorPickerOpen2={isCustomDrawColorPickerOpen2}
          onShapeFillColorChange={onShapeFillColorChange}
          onShapeFillStyleChange={onShapeFillStyleChange}
          onShapeStrokeColorChange={onShapeStrokeColorChange}
          onShapeStrokeWidthChange={onShapeStrokeWidthChange}
          uniColor={uniColor}
          activeSelectId={activeSelectId}
          setActiveSelectId={setActiveSelectId}
        />
      );
    }

    return (
      <SelectionStrokeControls
        scene={scene}
        selectedIds={selectedIds}
        drawingTool={drawingTool}
        localeMessages={localeMessages}
        customDrawColorPickerWrapRef={customDrawColorPickerWrapRef}
        customDrawColorPickerContentRef={customDrawColorPickerContentRef}
        isCustomDrawColorPickerOpen={isCustomDrawColorPickerOpen}
        setIsCustomDrawColorPickerOpen={setIsCustomDrawColorPickerOpen}
        customDrawColorPickerColor={customDrawColorPickerColor}
        setCustomDrawColorPickerColor={setCustomDrawColorPickerColor}
        onDrawStrokeWidthChange={onDrawStrokeWidthChange}
        onDrawStrokeColorChange={onDrawStrokeColorChange}
        onDrawDefaultStrokeColorChange={onDrawDefaultStrokeColorChange}
        onLineStartCapChange={onLineStartCapChange}
        onLineEndCapChange={onLineEndCapChange}
        uniColor={uniColor}
        activeSelectId={activeSelectId}
        setActiveSelectId={setActiveSelectId}
      />
    );
  };

  const resolveIdleCursor = (
    pointX: number,
    pointY: number,
    altKey: boolean,
  ): string => {
    if (drawingTool && drawingTool !== "image") {
      return "crosshair";
    }

    const selectedRectangle = getSingleSelectedRectangle();
    if (selectedRectangle) {
      const bounds = {
        x: selectedRectangle.x,
        y: selectedRectangle.y,
        width: selectedRectangle.width,
        height: selectedRectangle.height,
      };
      const center = getBoundsCenter(bounds);
      const localPoint = rotatePointAroundCenter(
        pointX,
        pointY,
        center.x,
        center.y,
        (-selectedRectangle.rotation * Math.PI) / 180,
      );

      if (
        getHoveredRectangleRadiusHandle(
          selectedRectangle,
          localPoint.x,
          localPoint.y,
          camera.zoom,
        )
      ) {
        return "pointer";
      }
    }

    if (interactionMode === "pan") {
      return "grab";
    }

    if (selectedElementId) {
      const selectedLine = scene.elements.find(
        (element): element is LineElement =>
          element.id === selectedElementId && element.type === "line",
      );

      if (selectedLine) {
        const localPoint = toLineLocalPointer(selectedLine, pointX, pointY);
        const hoveredHandle = getHoveredLineHandle(
          selectedLine,
          localPoint.x,
          localPoint.y,
          camera.zoom,
        );
        setHoveredLineHandle(hoveredHandle);

        if (hoveredHandle) {
          return "pointer";
        }
      } else {
        setHoveredLineHandle(null);
      }
    } else {
      setHoveredLineHandle(null);
    }

    const cornerAction = getHoverCornerAction(pointX, pointY);
    if (cornerAction) {
      setHoveredResizeHandle(
        cornerAction.mode === "resize" ? cornerAction.handle : null,
      );
      return cornerAction.mode === "resize"
        ? getResizeCursor(cornerAction.handle)
        : getRotateCursor(cornerAction.handle);
    }

    setHoveredResizeHandle(null);

    const hitId = findHitElement(scene.elements, pointX, pointY);
    if (hitId) {
      return altKey ? "clone" : "grab";
    }

    return "default";
  };

  const getMarqueeBounds = (selection: MarqueeSelection): ElementBounds => {
    const x = Math.min(selection.startX, selection.currentX);
    const y = Math.min(selection.startY, selection.currentY);
    const width = Math.abs(selection.currentX - selection.startX);
    const height = Math.abs(selection.currentY - selection.startY);

    return { x, y, width, height };
  };

  const getDrawingBounds = (selection: DrawingSelection): ElementBounds => {
    const dx = selection.currentX - selection.startX;
    const dy = selection.currentY - selection.startY;

    if (selection.fromCenter) {
      let halfWidth = Math.abs(dx);
      let halfHeight = Math.abs(dy);

      if (selection.lockAspect) {
        const size = Math.max(halfWidth, halfHeight);
        halfWidth = size;
        halfHeight = size;
      }

      return {
        x: selection.startX - halfWidth,
        y: selection.startY - halfHeight,
        width: halfWidth * 2,
        height: halfHeight * 2,
      };
    }

    if (selection.lockAspect) {
      const size = Math.max(Math.abs(dx), Math.abs(dy));
      return {
        x: dx >= 0 ? selection.startX : selection.startX - size,
        y: dy >= 0 ? selection.startY : selection.startY - size,
        width: size,
        height: size,
      };
    }

    return {
      x: Math.min(selection.startX, selection.currentX),
      y: Math.min(selection.startY, selection.currentY),
      width: Math.abs(dx),
      height: Math.abs(dy),
    };
  };

  const snapLinePointer = (
    startX: number,
    startY: number,
    pointerX: number,
    pointerY: number,
  ) => {
    const dx = pointerX - startX;
    const dy = pointerY - startY;

    if (dx === 0 && dy === 0) {
      return { x: pointerX, y: pointerY };
    }

    const angle = Math.atan2(dy, dx);
    const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    const distance = Math.hypot(dx, dy);

    return {
      x: startX + Math.cos(snapAngle) * distance,
      y: startY + Math.sin(snapAngle) * distance,
    };
  };

  const getLineDrawingSegment = (selection: DrawingSelection) => {
    if (selection.lockAspect) {
      const snapped = snapLinePointer(
        selection.startX,
        selection.startY,
        selection.currentX,
        selection.currentY,
      );

      return {
        startX: selection.startX,
        startY: selection.startY,
        endX: snapped.x,
        endY: snapped.y,
      };
    }

    return {
      startX: selection.startX,
      startY: selection.startY,
      endX: selection.currentX,
      endY: selection.currentY,
    };
  };

  const intersectsBounds = (a: ElementBounds, b: ElementBounds): boolean => {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  };

  const getElementsInsideMarquee = (selection: MarqueeSelection): string[] => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const marqueeBounds = getMarqueeBounds(selection);
    const selectedIds = new Set<string>();

    for (const element of scene.elements) {
      if (element.type === "text" && ctx) {
        ctx.font = getTextFont(element);
      }

      const elementBounds = getElementBounds(element.id, ctx, true);
      if (!elementBounds || !intersectsBounds(marqueeBounds, elementBounds)) {
        continue;
      }

      if (!element.groupId) {
        selectedIds.add(element.id);
        continue;
      }

      for (const groupedElement of scene.elements) {
        if (groupedElement.groupId === element.groupId) {
          selectedIds.add(groupedElement.id);
        }
      }
    }

    return [...selectedIds];
  };

  /* eslint-disable react-hooks/preserve-manual-memoization */
  const beginTextEditing = useCallback(
    (element: EditableElement) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      if (element.type === "text") {
        setEditingDocument(deserializeRichTextDocument(element.text));
        const measured = measureRichTextLayout(ctx, element.text, {
          fontFamily: element.fontFamily,
          fontSize: element.fontSize,
          fontWeight: element.fontWeight,
          fontStyle: element.fontStyle,
        });

        const startX = getAlignedStartX(
          element.x,
          measured.width,
          element.textAlign,
        );
        const screenPosition = worldToScreen(
          startX,
          element.y - element.fontSize,
        );

        setEditingText({
          id: element.id,
          value: element.text,
          anchorX: element.x,
          anchorY: element.y - element.fontSize,
          left: screenPosition.x,
          top: screenPosition.y,
          width: measured.width * camera.zoom,
          height: measured.height * camera.zoom,
          style: {
            fontFamily: element.fontFamily,
            fontSize: element.fontSize,
            fontWeight: element.fontWeight,
            fontStyle: element.fontStyle,
            color: element.color,
            textAlign: element.textAlign,
          },
        });
        return;
      }

      const shapeTextElement: TextElement = {
        id: element.id,
        type: "text",
        rotation: 0,
        x: getShapeTextAnchorX(element, element.textAlign),
        y: element.y + element.height / 2,
        text: element.text,
        fontFamily: element.fontFamily,
        fontSize: element.fontSize,
        fontWeight: element.fontWeight,
        fontStyle: element.fontStyle,
        color: element.color,
        textAlign: element.textAlign,
      };

      const measured = measureRichTextLayout(ctx, shapeTextElement.text, {
        fontFamily: shapeTextElement.fontFamily,
        fontSize: shapeTextElement.fontSize,
        fontWeight: shapeTextElement.fontWeight,
        fontStyle: shapeTextElement.fontStyle,
      });
      const maxTextWidth = Math.max(
        16,
        element.width - SHAPE_TEXT_HORIZONTAL_PADDING_PX * 2,
      );
      const clampedWidth = Math.min(measured.width, maxTextWidth);
      const anchorX = getShapeTextAnchorX(element, element.textAlign);
      const anchorY = element.y + element.height / 2 - measured.height / 2;
      const startX = getAlignedStartX(anchorX, clampedWidth, element.textAlign);
      const screenPosition = worldToScreen(startX, anchorY);

      setEditingDocument(deserializeRichTextDocument(element.text));

      setEditingText({
        id: element.id,
        value: element.text,
        anchorX,
        anchorY,
        left: screenPosition.x,
        top: screenPosition.y,
        width: clampedWidth * camera.zoom,
        height: measured.height * camera.zoom,
        maxWidth: maxTextWidth * camera.zoom,
        style: {
          fontFamily: element.fontFamily,
          fontSize: element.fontSize,
          fontWeight: element.fontWeight,
          fontStyle: element.fontStyle,
          color: element.color,
          textAlign: element.textAlign,
        },
      });
    },
    [camera.zoom, measureRichTextLayout, worldToScreen],
  );
  /* eslint-enable react-hooks/preserve-manual-memoization */

  const commitEditingText = (nextValue?: string) => {
    if (!editingText) {
      return;
    }

    const serializedValue =
      nextValue ??
      (editingDocument
        ? serializeRichTextDocument(editingDocument)
        : editingText.value);

    onTextCommit(editingText.id, serializedValue);
    setEditingDocument(null);
    setEditingText(null);
  };

  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const handleNativeWheel = (event: WheelEvent) => {
      const rect = canvas.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;

      event.preventDefault();

      if (event.ctrlKey || event.metaKey) {
        onWheelZoom(screenX, screenY, event.deltaY);
        return;
      }

      const horizontalDelta =
        event.shiftKey && Math.abs(event.deltaX) < Math.abs(event.deltaY)
          ? event.deltaY
          : event.deltaX;
      const verticalDelta =
        event.shiftKey && Math.abs(event.deltaX) < Math.abs(event.deltaY)
          ? 0
          : event.deltaY;

      onWheelPan(horizontalDelta, verticalDelta);
    };

    canvas.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => {
      canvas.removeEventListener("wheel", handleNativeWheel);
    };
  }, [onWheelPan, onWheelZoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const canvasStyles = getComputedStyle(canvas);
    const accentColor =
      canvasStyles.getPropertyValue("--accent").trim() || "#7c5cff";
    const accentRgb =
      normalizeRgbTriplet(canvasStyles.getPropertyValue("--accent-rgb")) ||
      normalizeRgbTriplet(accentColor) ||
      "124, 92, 255";
    const accentSelectionColor = `rgba(${accentRgb}, 0.45)`;
    const accentMarqueeFillColor = `rgba(${accentRgb}, 0.12)`;
    const guideColor = isDarkMode ? "#ff9b9b" : "#ff7a7a";
    const flipPreviewProgress = flipPreview
      ? Math.min(
          1,
          Math.max(
            0,
            (getCurrentTimestamp() - flipPreview.startedAt) /
              flipPreview.durationMs,
          ),
        )
      : null;
    const flipPreviewEasedProgress =
      flipPreviewProgress === null ? null : easeInOutCubic(flipPreviewProgress);

    const applyFlipPreviewTransform = (
      renderCtx: CanvasRenderingContext2D,
      bounds: ElementBounds,
      elementId: string,
    ) => {
      if (!flipPreview || flipPreviewEasedProgress === null) {
        return;
      }

      const item = flipPreview.items.get(elementId);
      if (!item) {
        return;
      }

      const nextCenterX = lerp(
        item.fromCenterX,
        item.toCenterX,
        flipPreviewEasedProgress,
      );
      const nextCenterY = lerp(
        item.fromCenterY,
        item.toCenterY,
        flipPreviewEasedProgress,
      );
      const rawScaleX =
        flipPreview.axis === "horizontal"
          ? 1 - flipPreviewEasedProgress * 2
          : 1;
      const rawScaleY =
        flipPreview.axis === "vertical" ? 1 - flipPreviewEasedProgress * 2 : 1;
      const scaleX =
        Math.abs(rawScaleX) < 0.001
          ? rawScaleX < 0
            ? -0.001
            : 0.001
          : rawScaleX;
      const scaleY =
        Math.abs(rawScaleY) < 0.001
          ? rawScaleY < 0
            ? -0.001
            : 0.001
          : rawScaleY;
      const center = getBoundsCenter(bounds);

      renderCtx.translate(nextCenterX, nextCenterY);
      renderCtx.scale(scaleX, scaleY);
      renderCtx.translate(-center.x, -center.y);
    };

    ctx.fillStyle = toThemeColor("#F4F5F4");
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.setTransform(
      camera.zoom,
      0,
      0,
      camera.zoom,
      -camera.x * camera.zoom,
      -camera.y * camera.zoom,
    );

    if (scene.settings.showGrid) {
      const gridSize = Math.max(4, scene.settings.gridSize);
      const visualStepMultiplier = Math.max(
        1,
        Math.ceil(MIN_GRID_SCREEN_SPACING / (gridSize * camera.zoom)),
      );
      const renderGridStep = gridSize * visualStepMultiplier;
      const worldLeft = camera.x;
      const worldTop = camera.y;
      const worldRight = camera.x + canvas.width / camera.zoom;
      const worldBottom = camera.y + canvas.height / camera.zoom;
      const startX = Math.floor(worldLeft / renderGridStep) * renderGridStep;
      const startY = Math.floor(worldTop / renderGridStep) * renderGridStep;
      const gridColor = isDarkMode ? "#ffffff10" : "#B3B2B370";

      if (scene.settings.gridStyle === "squares") {
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1 / camera.zoom;
        ctx.beginPath();

        for (let x = startX; x <= worldRight; x += renderGridStep) {
          ctx.moveTo(x, worldTop);
          ctx.lineTo(x, worldBottom);
        }

        for (let y = startY; y <= worldBottom; y += renderGridStep) {
          ctx.moveTo(worldLeft, y);
          ctx.lineTo(worldRight, y);
        }

        ctx.stroke();
      } else {
        const dotSize = 2 / camera.zoom;
        const dotOffset = dotSize / 2;
        ctx.fillStyle = gridColor;

        for (let x = startX; x <= worldRight; x += renderGridStep) {
          for (let y = startY; y <= worldBottom; y += renderGridStep) {
            ctx.fillRect(x - dotOffset, y - dotOffset, dotSize, dotSize);
          }
        }
      }
    }

    for (const element of scene.elements) {
      const isSelected = selectedIds.includes(element.id);
      const shouldShowElementSelection =
        isSelected && (!isWholeGroupSelected || selectedIds.length === 1);
      const isMarqueePreview =
        marqueeSelection !== null &&
        marqueePreviewIds.includes(element.id) &&
        !isSelected;
      const isMultiSelection = selectedIds.length > 1;
      const rotationRadians = (element.rotation * Math.PI) / 180;

      if (element.type === "draw") {
        const drawMode = element.drawMode ?? "draw";
        const bounds = measureElementBounds(element);
        const localSelectionBounds = {
          x: bounds.x - element.x,
          y: bounds.y - element.y,
          width: bounds.width,
          height: bounds.height,
        };
        const center = getBoundsCenter(bounds);

        ctx.save();
        applyFlipPreviewTransform(ctx, bounds, element.id);
        ctx.translate(center.x, center.y);
        ctx.rotate(rotationRadians);
        ctx.translate(-center.x, -center.y);
        ctx.translate(element.x, element.y);

        if (element.points.length > 0) {
          const renderStyle = getDrawRenderStyle(drawMode, isDarkMode);
          const previousComposite = ctx.globalCompositeOperation;
          const previousAlpha = ctx.globalAlpha;
          ctx.globalCompositeOperation = renderStyle.compositeOperation;
          ctx.globalAlpha *= renderStyle.opacity;

          const visibleStrokeWidth = getVisibleStrokeWidth(element.strokeWidth);
          ctx.strokeStyle = toThemeColor(element.stroke);
          ctx.fillStyle = toThemeColor(element.stroke);
          ctx.lineWidth = visibleStrokeWidth;
          ctx.lineJoin = "round";
          ctx.lineCap = getDrawLineCap();

          const visibleLocalPoints = element.points;

          if (visibleLocalPoints.length === 1) {
            if (drawMode === "marker") {
              drawMarkerStroke(ctx, visibleLocalPoints, visibleStrokeWidth);
            } else if (drawMode === "quill") {
              drawQuillStroke(
                ctx,
                visibleLocalPoints,
                visibleStrokeWidth,
                scene.settings.quillDrawOptimizations,
              );
            } else {
              ctx.beginPath();
              ctx.arc(
                visibleLocalPoints[0].x,
                visibleLocalPoints[0].y,
                ctx.lineWidth / 2,
                0,
                Math.PI * 2,
              );
              ctx.fillStyle = toThemeColor(element.stroke);
              ctx.fill();
            }
          } else if (visibleLocalPoints.length > 1) {
            if (drawMode === "marker") {
              drawMarkerStroke(ctx, visibleLocalPoints, visibleStrokeWidth);
            } else if (drawMode === "quill") {
              drawQuillStroke(
                ctx,
                visibleLocalPoints,
                visibleStrokeWidth,
                scene.settings.quillDrawOptimizations,
              );
            } else {
              ctx.beginPath();
              drawSmoothStrokePath(ctx, visibleLocalPoints);
              ctx.stroke();
            }
          }

          ctx.globalCompositeOperation = previousComposite;
          ctx.globalAlpha = previousAlpha;
        }

        if (shouldShowElementSelection) {
          ctx.strokeStyle = isMultiSelection
            ? accentSelectionColor
            : accentColor;
          ctx.lineWidth = 1 / camera.zoom;
          ctx.strokeRect(
            localSelectionBounds.x,
            localSelectionBounds.y,
            localSelectionBounds.width,
            localSelectionBounds.height,
          );

          if (canTransformSelection) {
            drawResizeHandles(
              ctx,
              localSelectionBounds,
              camera.zoom,
              accentColor,
            );
          }
        } else if (isMarqueePreview) {
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 1 / camera.zoom;
          ctx.strokeRect(
            localSelectionBounds.x,
            localSelectionBounds.y,
            localSelectionBounds.width,
            localSelectionBounds.height,
          );
        }

        ctx.restore();
        continue;
      }

      if (element.type === "image") {
        const imageElement = element as ImageElement;
        const bounds = {
          x: imageElement.x,
          y: imageElement.y,
          width: imageElement.width,
          height: imageElement.height,
        };
        const center = getBoundsCenter(bounds);
        const image = getCachedImage(imageElement.src);
        const cornerRadius = Math.min(
          16 / camera.zoom,
          Math.min(imageElement.width, imageElement.height) / 6,
        );

        ctx.save();
        applyFlipPreviewTransform(ctx, bounds, imageElement.id);
        ctx.translate(center.x, center.y);
        ctx.rotate(rotationRadians);
        ctx.translate(-center.x, -center.y);

        if (imageElement.flipX || imageElement.flipY) {
          ctx.translate(center.x, center.y);
          ctx.scale(imageElement.flipX ? -1 : 1, imageElement.flipY ? -1 : 1);
          ctx.translate(-center.x, -center.y);
        }

        ctx.shadowColor = "rgba(15, 23, 42, 0.14)";
        ctx.shadowBlur = 18 / camera.zoom;
        ctx.shadowOffsetY = 6 / camera.zoom;
        ctx.fillStyle = toThemeColor("#f4f5f4");
        drawRoundedRect(
          ctx,
          imageElement.x,
          imageElement.y,
          imageElement.width,
          imageElement.height,
          cornerRadius,
        );
        ctx.fill();

        ctx.save();
        drawRoundedRect(
          ctx,
          imageElement.x,
          imageElement.y,
          imageElement.width,
          imageElement.height,
          cornerRadius,
        );
        ctx.clip();

        if (
          image.complete &&
          image.naturalWidth > 0 &&
          image.naturalHeight > 0
        ) {
          ctx.drawImage(
            image,
            imageElement.x,
            imageElement.y,
            imageElement.width,
            imageElement.height,
          );
        } else {
          ctx.fillStyle = toThemeColor("#e6e7e8");
          ctx.fillRect(
            imageElement.x,
            imageElement.y,
            imageElement.width,
            imageElement.height,
          );
        }
        ctx.restore();

        ctx.shadowColor = "transparent";
        ctx.strokeStyle = toThemeColor("rgba(15, 23, 42, 0.08)");
        ctx.lineWidth = 1 / camera.zoom;
        drawRoundedRect(
          ctx,
          imageElement.x,
          imageElement.y,
          imageElement.width,
          imageElement.height,
          cornerRadius,
        );
        ctx.stroke();

        if (shouldShowElementSelection) {
          ctx.strokeStyle = isMultiSelection
            ? accentSelectionColor
            : accentColor;
          ctx.lineWidth = 1 / camera.zoom;
          ctx.strokeRect(
            imageElement.x,
            imageElement.y,
            imageElement.width,
            imageElement.height,
          );
        } else if (isMarqueePreview) {
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 1 / camera.zoom;
          ctx.strokeRect(
            imageElement.x,
            imageElement.y,
            imageElement.width,
            imageElement.height,
          );
        }

        if (shouldShowElementSelection && canTransformSelection) {
          drawResizeHandles(ctx, bounds, camera.zoom, accentColor);
        }

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
        const center = getBoundsCenter(bounds);
        const rectangleRadius =
          element.type === "rectangle"
            ? Math.max(
                0,
                Math.min(
                  element.borderRadius,
                  Math.min(element.width, element.height) / 2,
                ),
              )
            : 0;

        ctx.save();
        applyFlipPreviewTransform(ctx, bounds, element.id);
        ctx.translate(center.x, center.y);
        ctx.rotate(rotationRadians);
        ctx.translate(-center.x, -center.y);

        fillShape(ctx, element, rectangleRadius, toThemeColor);

        strokeShapeOutline(ctx, element, rectangleRadius, toThemeColor);

        if (editingText?.id !== element.id && element.text.trim().length > 0) {
          const shapeTextElement: TextElement = {
            id: `${element.id}-shape-text`,
            type: "text",
            rotation: 0,
            x: getShapeTextAnchorX(element, element.textAlign),
            y: element.y + element.height / 2,
            text: element.text,
            fontFamily: element.fontFamily,
            fontSize: element.fontSize,
            fontWeight: element.fontWeight,
            fontStyle: element.fontStyle,
            color: element.color,
            textAlign: element.textAlign,
          };

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

          ctx.font = getTextFont(shapeTextElement);
          ctx.fillStyle = toThemeColor(shapeTextElement.color);
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
          drawRichTextCentered(
            ctx,
            shapeTextElement.text,
            shapeTextElement.x,
            element.y + element.height / 2,
            {
              fontFamily: shapeTextElement.fontFamily,
              fontSize: shapeTextElement.fontSize,
              fontWeight: shapeTextElement.fontWeight,
              fontStyle: shapeTextElement.fontStyle,
              textAlign: shapeTextElement.textAlign,
            },
          );
          ctx.restore();
        }

        if (shouldShowElementSelection) {
          ctx.strokeStyle = isMultiSelection
            ? accentSelectionColor
            : accentColor;
          ctx.lineWidth = 1 / camera.zoom;
          ctx.strokeRect(element.x, element.y, element.width, element.height);
        } else if (isMarqueePreview) {
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 1 / camera.zoom;
          ctx.strokeRect(element.x, element.y, element.width, element.height);
        }

        if (shouldShowElementSelection && canTransformSelection) {
          drawResizeHandles(ctx, bounds, camera.zoom, accentColor);

          if (element.type === "rectangle") {
            const pointer = lastPointerRef.current;
            const isHoveringSelectedRectangle =
              pointer && hitTestRectangle(element, pointer.x, pointer.y);

            if (isHoveringSelectedRectangle) {
              const handles: ResizeHandle[] = ["nw", "ne", "se", "sw"];
              const radiusHandleRadius =
                RADIUS_HANDLE_SIZE_PX / (2 * camera.zoom);

              for (const handle of handles) {
                const radiusHandleCenter = getRectangleRadiusHandleCenter(
                  bounds,
                  element.borderRadius,
                  camera.zoom,
                  handle,
                );

                ctx.fillStyle = accentColor;
                ctx.beginPath();
                ctx.arc(
                  radiusHandleCenter.x,
                  radiusHandleCenter.y,
                  radiusHandleRadius,
                  0,
                  Math.PI * 2,
                );
                ctx.fill();

                ctx.strokeStyle = toThemeColor("#F4F5F4");
                ctx.lineWidth = 1 / camera.zoom;
                ctx.beginPath();
                ctx.arc(
                  radiusHandleCenter.x,
                  radiusHandleCenter.y,
                  radiusHandleRadius,
                  0,
                  Math.PI * 2,
                );
                ctx.stroke();
              }
            }
          }
        }

        ctx.restore();
        continue;
      }

      if (element.type === "line") {
        const lineElement = element as LineElement;
        const bounds = getLineSelectionBounds(lineElement);

        ctx.save();
        applyFlipPreviewTransform(ctx, bounds, lineElement.id);
        renderLineElement({
          ctx,
          lineElement,
          zoom: camera.zoom,
          accentColor,
          accentSelectionColor,
          toThemeColor,
          shouldShowElementSelection,
          isMultiSelection,
          isMarqueePreview,
          canTransformSelection,
          hoveredLineHandle,
          activeLineHandle,
        });
        ctx.restore();
        continue;
      }

      if (editingText?.id === element.id) {
        continue;
      }

      const textMetrics = measureRichTextLayout(ctx, element.text, {
        fontFamily: element.fontFamily,
        fontSize: element.fontSize,
        fontWeight: element.fontWeight,
        fontStyle: element.fontStyle,
      });
      const textWidth = textMetrics.width;
      const textBoundsWithoutPadding = {
        x: getAlignedStartX(element.x, textWidth, element.textAlign),
        y: element.y - element.fontSize,
        width: textWidth,
        height: textMetrics.height,
      };
      const textCenter = getBoundsCenter(textBoundsWithoutPadding);

      ctx.save();
      ctx.translate(textCenter.x, textCenter.y);
      ctx.rotate(rotationRadians);
      ctx.translate(-textCenter.x, -textCenter.y);

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

      if (shouldShowElementSelection) {
        const textBounds = getElementBounds(element.id, ctx, true);
        if (!textBounds) {
          ctx.restore();
          continue;
        }

        ctx.strokeStyle =
          selectedIds.length > 1 ? accentSelectionColor : accentColor;
        ctx.lineWidth = 1 / camera.zoom;
        ctx.strokeRect(
          textBounds.x,
          textBounds.y,
          textBounds.width,
          textBounds.height,
        );

        if (canTransformSelection) {
          drawResizeHandles(ctx, textBounds, camera.zoom, accentColor);
        }
      } else if (isMarqueePreview) {
        const textBounds = getElementBounds(element.id, ctx, true);
        if (textBounds) {
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 1 / camera.zoom;
          ctx.strokeRect(
            textBounds.x,
            textBounds.y,
            textBounds.width,
            textBounds.height,
          );
        }
      }

      ctx.restore();
    }

    if (selectedIds.length > 1 && !flipPreview) {
      const groupBounds = getSelectionBounds(selectedIds, ctx, true);
      if (groupBounds) {
        ctx.save();
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1 / camera.zoom;
        ctx.setLineDash([6 / camera.zoom, 4 / camera.zoom]);
        ctx.strokeRect(
          groupBounds.x,
          groupBounds.y,
          groupBounds.width,
          groupBounds.height,
        );
        ctx.setLineDash([]);
        drawResizeHandles(ctx, groupBounds, camera.zoom, accentColor);
        ctx.restore();
      }
    }

    if (isSingleElementWithinGroupSelected && !flipPreview) {
      const parentGroupBounds = getSelectionBounds(
        selectedGroupElementIds,
        ctx,
        true,
      );
      if (parentGroupBounds) {
        ctx.save();
        ctx.strokeStyle = accentSelectionColor;
        ctx.lineWidth = 1 / camera.zoom;
        ctx.setLineDash([6 / camera.zoom, 4 / camera.zoom]);
        ctx.strokeRect(
          parentGroupBounds.x,
          parentGroupBounds.y,
          parentGroupBounds.width,
          parentGroupBounds.height,
        );
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    drawSmartGuides(ctx, alignmentGuides, camera.zoom, guideColor);

    if (marqueeSelection) {
      const marqueeBounds = getMarqueeBounds(marqueeSelection);
      const marqueeRadius = 8 / camera.zoom;
      ctx.fillStyle = accentMarqueeFillColor;
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1 / camera.zoom;
      drawRoundedRect(
        ctx,
        marqueeBounds.x,
        marqueeBounds.y,
        marqueeBounds.width,
        marqueeBounds.height,
        marqueeRadius,
      );
      ctx.fill();
      ctx.stroke();
    }

    if (drawingSelection) {
      const drawingBounds = getDrawingBounds(drawingSelection);

      if (drawingSelection.type === "rectangle") {
        ctx.fillStyle = toThemeColor("#f5f5f5");
        ctx.fillRect(
          drawingBounds.x,
          drawingBounds.y,
          drawingBounds.width,
          drawingBounds.height,
        );
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1 / camera.zoom;
        ctx.strokeRect(
          drawingBounds.x,
          drawingBounds.y,
          drawingBounds.width,
          drawingBounds.height,
        );
      } else if (drawingSelection.type === "circle") {
        const centerX = drawingBounds.x + drawingBounds.width / 2;
        const centerY = drawingBounds.y + drawingBounds.height / 2;

        ctx.fillStyle = toThemeColor("#f5f5f5");
        ctx.beginPath();
        ctx.ellipse(
          centerX,
          centerY,
          drawingBounds.width / 2,
          drawingBounds.height / 2,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1 / camera.zoom;
        ctx.beginPath();
        ctx.ellipse(
          centerX,
          centerY,
          drawingBounds.width / 2,
          drawingBounds.height / 2,
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      } else if (drawingSelection.type === "line") {
        const segment = getLineDrawingSegment(drawingSelection);

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2 / camera.zoom;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(segment.startX, segment.startY);
        ctx.lineTo(segment.endX, segment.endY);
        ctx.stroke();
      } else {
        const fontSize = Math.max(10, Math.round(drawingBounds.height));
        const previewTextElement: TextElement = {
          id: "preview-text",
          type: "text",
          rotation: 0,
          x: drawingBounds.x,
          y: drawingBounds.y + fontSize,
          text: localeMessages.canvas.newText,
          fontFamily: "Shantell Sans, sans-serif",
          fontSize,
          fontWeight: "200",
          fontStyle: "normal",
          color: "#2f3b52",
          textAlign: "left",
        };

        ctx.font = getTextFont(previewTextElement);
        ctx.fillStyle = toThemeColor(previewTextElement.color);
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(
          previewTextElement.text,
          previewTextElement.x,
          previewTextElement.y,
        );
      }
    }

    if (drawSelection && drawSelection.points.length > 0) {
      const renderStyle = getDrawRenderStyle(
        drawSelection.drawMode,
        isDarkMode,
      );
      const previousComposite = ctx.globalCompositeOperation;
      const previousAlpha = ctx.globalAlpha;

      ctx.globalCompositeOperation = renderStyle.compositeOperation;
      ctx.globalAlpha *= renderStyle.opacity;
      ctx.save();
      const visibleStrokeWidth = getVisibleStrokeWidth(
        drawSelection.strokeWidth,
      );
      ctx.strokeStyle = toThemeColor(drawSelection.stroke);
      ctx.fillStyle = toThemeColor(drawSelection.stroke);
      ctx.lineWidth = visibleStrokeWidth;
      ctx.lineJoin = "round";
      ctx.lineCap = getDrawLineCap();

      if (drawSelection.points.length === 1) {
        if (drawSelection.drawMode === "marker") {
          drawMarkerStroke(ctx, drawSelection.points, visibleStrokeWidth);
        } else if (drawSelection.drawMode === "quill") {
          drawQuillStroke(
            ctx,
            drawSelection.points,
            visibleStrokeWidth,
            scene.settings.quillDrawOptimizations,
          );
        } else {
          ctx.beginPath();
          ctx.arc(
            drawSelection.points[0].x,
            drawSelection.points[0].y,
            ctx.lineWidth / 2,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = toThemeColor(drawSelection.stroke);
          ctx.fill();
        }
      } else {
        if (drawSelection.drawMode === "marker") {
          drawMarkerStroke(ctx, drawSelection.points, visibleStrokeWidth);
        } else if (drawSelection.drawMode === "quill") {
          drawQuillStroke(
            ctx,
            drawSelection.points,
            visibleStrokeWidth,
            scene.settings.quillDrawOptimizations,
          );
        } else {
          ctx.beginPath();
          drawSmoothStrokePath(ctx, drawSelection.points);
          ctx.stroke();
        }
      }

      ctx.restore();
      ctx.globalCompositeOperation = previousComposite;
      ctx.globalAlpha = previousAlpha;
    }

    if (laserTrails.length > 0) {
      ctx.save();
      ctx.fillStyle = LASER_COLOR;

      for (const trail of laserTrails) {
        if (trail.points.length === 0) {
          continue;
        }

        drawLaserTrail(ctx, trail.points, laserNow, camera);
      }

      ctx.restore();
    }

    ctx.restore();
  });

  useEffect(() => {
    if (!editingText) {
      focusedEditingTextIdRef.current = null;
      return;
    }

    if (focusedEditingTextIdRef.current === editingText.id) {
      return;
    }

    focusedEditingTextIdRef.current = editingText.id;

    requestAnimationFrame(() => {
      ReactEditor.focus(editor);
      const end = Editor.end(editor, []);
      Transforms.select(editor, end);
    });
  }, [editor, editingText]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if (
        event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !editingText
      ) {
        if (key === "h") {
          if (!canFlipSelection) {
            return;
          }

          event.preventDefault();
          handleFlipSelectionWithAnimation("horizontal");
          return;
        }

        if (key === "v") {
          if (!canFlipSelection) {
            return;
          }

          event.preventDefault();
          handleFlipSelectionWithAnimation("vertical");
          return;
        }
      }

      if (event.ctrlKey || event.metaKey) {
        const hotkey = key;
        if (hotkey === "b" || hotkey === "i") {
          if (editingText) {
            return;
          }

          const selectedTextElements = getSelectedTextElements(
            scene.elements,
            selectedIds,
          );

          if (selectedTextElements.length === 0) {
            return;
          }

          event.preventDefault();

          if (hotkey === "b") {
            const areAllBold = selectedTextElements.every(
              (element) =>
                element.fontWeight === "700" ||
                element.fontWeight === "800" ||
                element.fontWeight === "900" ||
                element.fontWeight === "bold",
            );

            onTextFontWeightChange(
              selectedTextElements.map((element) => element.id),
              areAllBold ? "200" : "700",
            );
            return;
          }

          const areAllItalic = selectedTextElements.every(
            (element) => element.fontStyle === "italic",
          );

          onTextFontStyleChange(
            selectedTextElements.map((element) => element.id),
            areAllItalic ? "normal" : "italic",
          );
          return;
        }
      }

      if (event.key !== "Enter" || editingText) {
        return;
      }

      const selectedElement = scene.elements.find(
        (element) => element.id === selectedElementId,
      );

      if (
        !selectedElement ||
        (selectedElement.type !== "text" &&
          selectedElement.type !== "rectangle" &&
          selectedElement.type !== "circle")
      ) {
        return;
      }

      event.preventDefault();
      beginTextEditing(selectedElement);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    beginTextEditing,
    canFlipSelection,
    camera.zoom,
    handleFlipSelectionWithAnimation,
    measureRichTextLayout,
    worldToScreen,
    scene.elements,
    selectedElementId,
    selectedIds,
    editingText,
    onTextFontWeightChange,
    onTextFontStyleChange,
  ]);

  useEffect(() => {
    if (!editingText) {
      return;
    }

    const margin = 24;
    const rightOverflow =
      editingText.left + editingText.width - canvasSize.width;
    const leftOverflow = -editingText.left;
    const bottomOverflow =
      editingText.top + editingText.height - canvasSize.height;
    const topOverflow = -editingText.top;

    let panX = 0;
    let panY = 0;

    if (rightOverflow > -margin) {
      panX = rightOverflow + margin;
    } else if (leftOverflow > -margin) {
      panX = -(leftOverflow + margin);
    }

    if (bottomOverflow > -margin) {
      panY = bottomOverflow + margin;
    } else if (topOverflow > -margin) {
      panY = -(topOverflow + margin);
    }

    if (panX !== 0 || panY !== 0) {
      onWheelPan(panX, panY);
    }
  }, [
    camera.zoom,
    canvasSize.height,
    canvasSize.width,
    editingText,
    onWheelPan,
  ]);

  useEffect(() => {
    const handleFontsLoaded = () => {
      if (!fontsLoadedRef.current) {
        fontsLoadedRef.current = true;
        setTimeout(() => {
          setRenderTrigger((prev) => prev + 1);
        }, 0);
      }
    };

    if (
      (window as unknown as { __FONTS_LOADED__?: boolean }).__FONTS_LOADED__
    ) {
      fontsLoadedRef.current = true;
    }

    window.addEventListener("fontsLoaded", handleFontsLoaded);
    return () => {
      window.removeEventListener("fontsLoaded", handleFontsLoaded);
    };
  }, []);

  const handleDragOver = (event: React.DragEvent<HTMLCanvasElement>) => {
    if (
      !Array.from(event.dataTransfer.items).some((item) => item.kind === "file")
    ) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (event: React.DragEvent<HTMLCanvasElement>) => {
    const files = Array.from(event.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (files.length === 0) {
      return;
    }

    event.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    const point = screenToWorld(screenX, screenY);
    onDropImageFiles(files, point.x, point.y);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const pointer = screenToWorld(screenX, screenY);
    lastPointerRef.current = pointer;

    if (e.button === 1) {
      e.preventDefault();
      isMiddleMousePanningRef.current = true;
      panStateRef.current = { screenX, screenY };
      lineHandleDragRef.current = null;
      setActiveLineHandle(null);
      setActiveRotatingHandle(null);
      setActiveResizeHandle(null);
      setMarqueeSelection(null);
      setIsDraggingElement(false);
      setIsDuplicateDragging(false);
      setCanvasCursor("grabbing");
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    if (interactionMode === "pan") {
      panStateRef.current = { screenX, screenY };
      lineHandleDragRef.current = null;
      setActiveLineHandle(null);
      setActiveRotatingHandle(null);
      setActiveResizeHandle(null);
      setMarqueeSelection(null);
      setIsDraggingElement(false);
      setIsDuplicateDragging(false);
      setCanvasCursor("grabbing");
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    if (drawingTool && drawingTool !== "image") {
      if (editingText) {
        commitEditingText();
      }

      lineHandleDragRef.current = null;
      setActiveLineHandle(null);

      if (drawingTool === "laser") {
        startLaserTrail(pointer);
      } else if (
        drawingTool === "draw" ||
        drawingTool === "marker" ||
        drawingTool === "quill"
      ) {
        const now = getCurrentTimestamp();
        const drawMode = drawingTool;
        const drawStyle = getActiveDrawStyle(drawMode);

        setDrawSelection({
          points: [{ ...pointer, t: now }],
          stroke: drawStyle.stroke,
          strokeWidth: drawStyle.strokeWidth,
          drawMode,
          isLine: e.shiftKey,
        });
      } else if (drawingTool === "line") {
        setDrawingSelection({
          type: "line",
          startX: pointer.x,
          startY: pointer.y,
          currentX: pointer.x,
          currentY: pointer.y,
          fromCenter: false,
          lockAspect: e.shiftKey,
        });
      } else {
        setDrawingSelection({
          type: drawingTool,
          startX: pointer.x,
          startY: pointer.y,
          currentX: pointer.x,
          currentY: pointer.y,
          fromCenter: e.altKey,
          lockAspect: e.shiftKey,
        });
      }

      if (drawingTool === "laser") {
        setCanvasCursor("laser");
      } else if (drawingTool === "draw") {
        setCanvasCursor("pencil");
      } else if (drawingTool === "quill") {
        setCanvasCursor("quill");
      } else if (drawingTool === "marker") {
        setCanvasCursor("marker");
      } else {
        setCanvasCursor("crosshair");
      }
      setActiveRotatingHandle(null);
      setActiveResizeHandle(null);
      setMarqueeSelection(null);
      setIsDraggingElement(false);
      setIsDuplicateDragging(false);
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    if (selectedIds.length > 1 && !editingText) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const groupBounds = getSelectionBounds(selectedIds, ctx, true);
        if (groupBounds) {
          const cornerAction = findCornerAction(
            groupBounds,
            pointer.x,
            pointer.y,
            camera.zoom,
          );

          if (cornerAction?.mode === "resize") {
            onGroupResizeStart(
              cornerAction.handle,
              pointer.x,
              pointer.y,
              groupBounds,
              selectedIds,
            );
            setActiveResizeHandle(cornerAction.handle);
            setActiveRotatingHandle(null);
            setIsDraggingElement(false);
            setIsDuplicateDragging(false);
            setMarqueeSelection(null);
            setMarqueePreviewIds([]);
            setCanvasCursor(getResizeCursor(cornerAction.handle));
            canvas.setPointerCapture(e.pointerId);
            return;
          }

          if (cornerAction?.mode === "rotate") {
            const center = getBoundsCenter(groupBounds);
            onGroupRotateStart(
              center.x,
              center.y,
              pointer.x,
              pointer.y,
              selectedIds,
            );
            setActiveRotatingHandle(cornerAction.handle);
            setActiveResizeHandle(null);
            setIsDraggingElement(false);
            setIsDuplicateDragging(false);
            setMarqueeSelection(null);
            setMarqueePreviewIds([]);
            setCanvasCursor(getRotateCursor(cornerAction.handle));
            canvas.setPointerCapture(e.pointerId);
            return;
          }
        }
      }
    }

    if (selectedElementId && !editingText) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const selectedElement = scene.elements.find(
          (element) => element.id === selectedElementId,
        );

        if (selectedElement?.type === "line") {
          const localPoint = toLineLocalPointer(
            selectedElement,
            pointer.x,
            pointer.y,
          );
          const hoveredHandle = getHoveredLineHandle(
            selectedElement,
            localPoint.x,
            localPoint.y,
            camera.zoom,
          );

          if (hoveredHandle) {
            onLineEditStart();
            lineHandleDragRef.current = {
              id: selectedElement.id,
              handle: hoveredHandle,
              startLine: {
                x: selectedElement.x,
                y: selectedElement.y,
                width: selectedElement.width,
                height: selectedElement.height,
                controlPoint: selectedElement.controlPoint ?? null,
              },
            };
            setActiveLineHandle(hoveredHandle);
            setHoveredLineHandle(hoveredHandle);
            setActiveRotatingHandle(null);
            setActiveResizeHandle(null);
            setIsDraggingElement(false);
            setIsDuplicateDragging(false);
            setMarqueeSelection(null);
            setCanvasCursor("pointer");
            canvas.setPointerCapture(e.pointerId);
            return;
          }
        }

        if (selectedElement?.type === "text") {
          ctx.font = getTextFont(selectedElement);
        }

        const bounds =
          selectedElement?.type === "line"
            ? null
            : getElementBounds(selectedElementId, ctx, true);
        if (bounds) {
          const selectedElement = scene.elements.find(
            (element) => element.id === selectedElementId,
          );
          const rotationRadians =
            ((selectedElement?.rotation ?? 0) * Math.PI) / 180;
          const center = getBoundsCenter(bounds);
          const localPoint = rotatePointAroundCenter(
            pointer.x,
            pointer.y,
            center.x,
            center.y,
            -rotationRadians,
          );

          if (
            selectedElement?.type === "rectangle" &&
            getHoveredRectangleRadiusHandle(
              selectedElement,
              localPoint.x,
              localPoint.y,
              camera.zoom,
            )
          ) {
            const hoveredRadiusHandle = getHoveredRectangleRadiusHandle(
              selectedElement,
              localPoint.x,
              localPoint.y,
              camera.zoom,
            );
            if (!hoveredRadiusHandle) {
              return;
            }

            setActiveRadiusElementId(selectedElement.id);
            setActiveRadiusHandle(hoveredRadiusHandle);
            setActiveRotatingHandle(null);
            setActiveResizeHandle(null);
            setIsDraggingElement(false);
            setIsDuplicateDragging(false);
            setMarqueeSelection(null);
            setCanvasCursor("pointer");
            canvas.setPointerCapture(e.pointerId);
            return;
          }

          const cornerAction = findCornerAction(
            bounds,
            localPoint.x,
            localPoint.y,
            camera.zoom,
          );
          if (cornerAction?.mode === "rotate") {
            onRotateStart(
              selectedElementId,
              center.x,
              center.y,
              pointer.x,
              pointer.y,
            );
            setActiveRotatingHandle(cornerAction.handle);
            setActiveResizeHandle(null);
            setIsDraggingElement(false);
            setIsDuplicateDragging(false);
            setCanvasCursor(getRotateCursor(cornerAction.handle));
            canvas.setPointerCapture(e.pointerId);
            return;
          }

          if (cornerAction?.mode === "resize") {
            const contentBounds = getElementBounds(
              selectedElementId,
              ctx,
              false,
            );

            onResizeStart(
              selectedElementId,
              cornerAction.handle,
              pointer.x,
              pointer.y,
              contentBounds ?? bounds,
            );
            setActiveResizeHandle(cornerAction.handle);
            setActiveRotatingHandle(null);
            setIsDraggingElement(false);
            setIsDuplicateDragging(false);
            setCanvasCursor(getResizeCursor(cornerAction.handle));
            canvas.setPointerCapture(e.pointerId);
            return;
          }
        }
      }
    }

    if (editingText) {
      commitEditingText();
    }

    const hitId = findHitElement(scene.elements, pointer.x, pointer.y);

    if (!hitId) {
      setActiveRotatingHandle(null);
      setActiveResizeHandle(null);
      setIsDraggingElement(false);
      setIsDuplicateDragging(false);
      setMarqueeSelection({
        startX: pointer.x,
        startY: pointer.y,
        currentX: pointer.x,
        currentY: pointer.y,
      });
      setCanvasCursor("default");
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    const dragging = Boolean(hitId);
    const hitElement = scene.elements.find((element) => element.id === hitId);
    const duplicateDragging = dragging && e.altKey && !hitElement?.groupId;
    setActiveRotatingHandle(null);
    setActiveResizeHandle(null);
    setMarqueeSelection(null);
    setIsDraggingElement(dragging);
    setIsDuplicateDragging(duplicateDragging);
    setCanvasCursor(
      dragging ? (duplicateDragging ? "clone" : "grabbing") : "default",
    );

    onPointerDown(
      pointer.x,
      pointer.y,
      e.altKey,
      e.shiftKey,
      e.ctrlKey || e.metaKey,
    );
    canvas.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const pointer = screenToWorld(screenX, screenY);
    lastPointerRef.current = pointer;

    if (isMiddleMousePanningRef.current) {
      const panState = panStateRef.current;
      if (panState) {
        const deltaX = screenX - panState.screenX;
        const deltaY = screenY - panState.screenY;

        if (deltaX !== 0 || deltaY !== 0) {
          onWheelPan(-deltaX, -deltaY);
          panStateRef.current = { screenX, screenY };
        }
      }

      setCanvasCursor("grabbing");
      return;
    }

    if (interactionMode === "pan") {
      const panState = panStateRef.current;
      if (panState) {
        const deltaX = screenX - panState.screenX;
        const deltaY = screenY - panState.screenY;

        if (deltaX !== 0 || deltaY !== 0) {
          onWheelPan(-deltaX, -deltaY);
          panStateRef.current = { screenX, screenY };
        }

        setCanvasCursor("grabbing");
      } else {
        setCanvasCursor("grab");
      }

      return;
    }

    if (drawingTool) {
      if (drawingTool === "laser") {
        appendLaserPoint(pointer, camera.zoom);
      } else if (
        drawingTool === "draw" ||
        drawingTool === "marker" ||
        drawingTool === "quill"
      ) {
        const now = getCurrentTimestamp();
        setDrawSelection((current) => {
          if (!current) {
            return current;
          }

          const isLineMode = e.shiftKey;
          let constrainedPointer: { x: number; y: number; t?: number } = {
            ...pointer,
            t: now,
          };

          if (isLineMode && current.points.length > 0) {
            const startPoint = current.points[0];
            const deltaX = Math.abs(pointer.x - startPoint.x);
            const deltaY = Math.abs(pointer.y - startPoint.y);

            if (deltaX > deltaY) {
              constrainedPointer = { x: pointer.x, y: startPoint.y, t: now };
            } else {
              constrainedPointer = { x: startPoint.x, y: pointer.y, t: now };
            }

            const currentEndPoint =
              current.points.length > 1 ? current.points[1] : null;
            const minimumDistance = 0.5 / camera.zoom;

            if (
              currentEndPoint &&
              Math.hypot(
                constrainedPointer.x - currentEndPoint.x,
                constrainedPointer.y - currentEndPoint.y,
              ) < minimumDistance
            ) {
              return current;
            }

            return {
              ...current,
              isLine: true,
              points: [startPoint, constrainedPointer],
            };
          }

          if (typeof constrainedPointer.t !== "number") {
            constrainedPointer = { ...constrainedPointer, t: now };
          }

          const previousPoint = current.points[current.points.length - 1];
          const minimumDistance = 2 / camera.zoom;

          if (
            previousPoint &&
            Math.hypot(
              constrainedPointer.x - previousPoint.x,
              constrainedPointer.y - previousPoint.y,
            ) < minimumDistance
          ) {
            return current;
          }

          return {
            ...current,
            isLine: false,
            points: [...current.points, constrainedPointer],
          };
        });
      } else if (drawingSelection) {
        setDrawingSelection((current) => {
          if (!current) {
            return current;
          }

          if (current.type === "line") {
            const snappedPoint = e.shiftKey
              ? snapLinePointer(
                  current.startX,
                  current.startY,
                  pointer.x,
                  pointer.y,
                )
              : pointer;

            return {
              ...current,
              currentX: snappedPoint.x,
              currentY: snappedPoint.y,
              lockAspect: e.shiftKey,
            };
          }

          return {
            ...current,
            currentX: pointer.x,
            currentY: pointer.y,
            fromCenter: e.altKey,
            lockAspect: e.shiftKey,
          };
        });
      }

      if (drawingTool === "laser") {
        setCanvasCursor("laser");
      } else if (drawingTool === "draw") {
        setCanvasCursor("pencil");
      } else if (drawingTool === "quill") {
        setCanvasCursor("quill");
      } else if (drawingTool === "marker") {
        setCanvasCursor("marker");
      } else {
        setCanvasCursor("crosshair");
      }
      return;
    }

    const activeLineDrag = lineHandleDragRef.current;
    if (activeLineDrag) {
      const activeLine = scene.elements.find(
        (element): element is LineElement =>
          element.id === activeLineDrag.id && element.type === "line",
      );

      if (activeLine) {
        const localPointer = toLineLocalPointer(
          activeLine,
          pointer.x,
          pointer.y,
        );
        const startPoint = {
          x: activeLineDrag.startLine.x,
          y: activeLineDrag.startLine.y,
        };
        const endPoint = {
          x: activeLineDrag.startLine.x + activeLineDrag.startLine.width,
          y: activeLineDrag.startLine.y + activeLineDrag.startLine.height,
        };

        let nextStart = startPoint;
        let nextEnd = endPoint;
        let nextControl = activeLineDrag.startLine.controlPoint;

        if (activeLineDrag.handle === "start") {
          nextStart = localPointer;
        } else if (activeLineDrag.handle === "end") {
          nextEnd = localPointer;
        } else {
          nextControl = { x: localPointer.x, y: localPointer.y };
        }

        const snap = (value: number) =>
          scene.settings.snapToGrid
            ? Math.round(value / scene.settings.gridSize) *
              scene.settings.gridSize
            : value;

        const snappedStart = { x: snap(nextStart.x), y: snap(nextStart.y) };
        const snappedEnd = { x: snap(nextEnd.x), y: snap(nextEnd.y) };
        const snappedControl = nextControl
          ? { x: snap(nextControl.x), y: snap(nextControl.y) }
          : null;

        onLineGeometryChange(activeLineDrag.id, {
          x: snappedStart.x,
          y: snappedStart.y,
          width: snappedEnd.x - snappedStart.x,
          height: snappedEnd.y - snappedStart.y,
          controlPoint: snappedControl,
        });
      }

      setCanvasCursor("pointer");
      return;
    }

    if (activeRadiusElementId) {
      const element = scene.elements.find(
        (item) => item.id === activeRadiusElementId,
      );
      if (element && element.type === "rectangle" && activeRadiusHandle) {
        const bounds = {
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
        };
        const center = getBoundsCenter(bounds);
        const localPoint = rotatePointAroundCenter(
          pointer.x,
          pointer.y,
          center.x,
          center.y,
          (-element.rotation * Math.PI) / 180,
        );
        const offset = RADIUS_HANDLE_OFFSET_PX / camera.zoom;
        const right = element.x + element.width;
        const bottom = element.y + element.height;
        let nextRadius: number;

        if (activeRadiusHandle === "nw") {
          nextRadius = Math.min(
            localPoint.x - element.x - offset,
            localPoint.y - element.y - offset,
          );
        } else if (activeRadiusHandle === "ne") {
          nextRadius = Math.min(
            right - localPoint.x - offset,
            localPoint.y - element.y - offset,
          );
        } else if (activeRadiusHandle === "se") {
          nextRadius = Math.min(
            right - localPoint.x - offset,
            bottom - localPoint.y - offset,
          );
        } else {
          nextRadius = Math.min(
            localPoint.x - element.x - offset,
            bottom - localPoint.y - offset,
          );
        }

        const clampedRadius = Math.max(
          0,
          Math.min(nextRadius, Math.min(element.width, element.height) / 2),
        );

        onRectangleBorderRadiusChange([element.id], clampedRadius);
      }

      setCanvasCursor("pointer");
      return;
    }

    if (marqueeSelection) {
      setMarqueeSelection((current) => {
        if (!current) {
          return current;
        }

        const updated = {
          ...current,
          currentX: pointer.x,
          currentY: pointer.y,
        };
        setMarqueePreviewIds(getElementsInsideMarquee(updated));
        return updated;
      });
      setCanvasCursor("default");
      return;
    }

    onPointerMove(pointer.x, pointer.y, e.shiftKey, e.altKey);

    if (activeRotatingHandle) {
      setCanvasCursor(getRotateCursor(activeRotatingHandle));
      return;
    }

    if (activeResizeHandle) {
      setCanvasCursor(getResizeCursor(activeResizeHandle));
      return;
    }

    if (isDraggingElement) {
      setCanvasCursor(isDuplicateDragging ? "clone" : "grabbing");
      return;
    }

    setCanvasCursor(resolveIdleCursor(pointer.x, pointer.y, e.altKey));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (interactionMode === "pan") {
      panStateRef.current = null;
      setActiveRadiusElementId(null);
      setActiveRadiusHandle(null);
      setCanvasCursor("grab");
      return;
    }

    if (isMiddleMousePanningRef.current) {
      isMiddleMousePanningRef.current = false;
      panStateRef.current = null;
      setActiveRadiusElementId(null);
      setActiveRadiusHandle(null);

      const rect = canvas?.getBoundingClientRect();
      if (rect) {
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const pointer = screenToWorld(screenX, screenY);
        lastPointerRef.current = pointer;
        setCanvasCursor(resolveIdleCursor(pointer.x, pointer.y, e.altKey));
      } else {
        setCanvasCursor("default");
      }
      return;
    }

    if (drawingTool) {
      if (drawingTool === "laser") {
        clearActiveLaserTrail();
      } else if (
        drawingTool === "draw" ||
        drawingTool === "marker" ||
        drawingTool === "quill"
      ) {
        if (drawSelection && drawSelection.points.length >= 1) {
          onCreateDrawElement(drawSelection.points, {
            drawMode: drawSelection.drawMode,
            stroke: drawSelection.stroke,
          });
        }

        setDrawSelection(null);
      } else if (drawingSelection) {
        if (drawingSelection.type === "line") {
          const segment = getLineDrawingSegment(drawingSelection);
          const length = Math.hypot(
            segment.endX - segment.startX,
            segment.endY - segment.startY,
          );

          if (length >= 1) {
            onCreateElement(
              "line",
              segment.startX,
              segment.startY,
              localeMessages,
              {
                x: segment.startX,
                y: segment.startY,
                width: segment.endX - segment.startX,
                height: segment.endY - segment.startY,
              },
            );
          }
        } else {
          const drawingBounds = getDrawingBounds(drawingSelection);
          onCreateElement(
            drawingSelection.type,
            drawingBounds.x,
            drawingBounds.y,
            localeMessages,
            drawingBounds,
          );
        }

        setDrawingSelection(null);
        onDrawingToolComplete();
      }

      setActiveRadiusElementId(null);
      setActiveRadiusHandle(null);
      if (drawingTool === "laser") {
        setCanvasCursor("laser");
      } else if (drawingTool === "draw") {
        setCanvasCursor("pencil");
      } else if (drawingTool === "quill") {
        setCanvasCursor("quill");
      } else if (drawingTool === "marker") {
        setCanvasCursor("marker");
      } else {
        setCanvasCursor("crosshair");
      }
      return;
    }

    if (lineHandleDragRef.current) {
      onPointerUp();
      lineHandleDragRef.current = null;
      setActiveLineHandle(null);

      const rect = canvas?.getBoundingClientRect();
      if (rect) {
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const pointer = screenToWorld(screenX, screenY);
        lastPointerRef.current = pointer;
        setCanvasCursor(resolveIdleCursor(pointer.x, pointer.y, e.altKey));
      } else {
        setCanvasCursor("default");
      }
      return;
    }

    if (activeRadiusElementId) {
      setActiveRadiusElementId(null);
      setActiveRadiusHandle(null);
      const rect = canvas?.getBoundingClientRect();
      if (rect) {
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const pointer = screenToWorld(screenX, screenY);
        setCanvasCursor(resolveIdleCursor(pointer.x, pointer.y, e.altKey));
      } else {
        setCanvasCursor("default");
      }
      return;
    }

    if (marqueeSelection) {
      const selectedInMarquee = getElementsInsideMarquee(marqueeSelection);
      const nextSelection = e.shiftKey
        ? Array.from(new Set([...selectedIds, ...selectedInMarquee]))
        : selectedInMarquee;
      onSelectElements(nextSelection);
      setMarqueeSelection(null);
      setMarqueePreviewIds([]);
      setActiveRotatingHandle(null);
      setActiveResizeHandle(null);
      setIsDraggingElement(false);
      setIsDuplicateDragging(false);

      const rect = canvas?.getBoundingClientRect();
      if (rect) {
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const pointer = screenToWorld(screenX, screenY);
        lastPointerRef.current = pointer;
        setCanvasCursor(resolveIdleCursor(pointer.x, pointer.y, e.altKey));
      } else {
        setCanvasCursor("default");
      }

      return;
    }

    onPointerUp();

    setActiveRotatingHandle(null);
    setActiveResizeHandle(null);
    setHoveredResizeHandle(null);
    lineHandleDragRef.current = null;
    setActiveLineHandle(null);
    setHoveredLineHandle(null);
    setIsDraggingElement(false);
    setIsDuplicateDragging(false);

    const rect = canvas?.getBoundingClientRect();
    if (rect) {
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const pointer = screenToWorld(screenX, screenY);
      lastPointerRef.current = pointer;
      setCanvasCursor(resolveIdleCursor(pointer.x, pointer.y, e.altKey));
    } else {
      setCanvasCursor("default");
    }
  };

  const handlePointerLeave = () => {
    lastPointerRef.current = null;

    if (isMiddleMousePanningRef.current) {
      setCanvasCursor("grabbing");
      return;
    }

    if (interactionMode === "pan") {
      setCanvasCursor(panStateRef.current ? "grabbing" : "grab");
      return;
    }

    if (drawingTool) {
      if (drawingTool === "laser") {
        clearActiveLaserTrail();
        setCanvasCursor("laser");
      } else if (drawingTool === "draw") {
        setCanvasCursor("pencil");
      } else if (drawingTool === "quill") {
        setCanvasCursor("quill");
      } else if (drawingTool === "marker") {
        setCanvasCursor("marker");
      } else {
        setCanvasCursor("crosshair");
      }
      return;
    }

    if (lineHandleDragRef.current || activeLineHandle) {
      setCanvasCursor("pointer");
      return;
    }

    if (activeRadiusElementId) {
      setCanvasCursor("pointer");
      return;
    }

    if (marqueeSelection) {
      setCanvasCursor("default");
      return;
    }

    setHoveredResizeHandle(null);
    setHoveredLineHandle(null);

    if (activeRotatingHandle) {
      setCanvasCursor(getRotateCursor(activeRotatingHandle));
      return;
    }

    if (activeResizeHandle) {
      setCanvasCursor(getResizeCursor(activeResizeHandle));
      return;
    }

    if (isDraggingElement) {
      setCanvasCursor(isDuplicateDragging ? "clone" : "grabbing");
      return;
    }

    setCanvasCursor("default");
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (interactionMode === "pan" || drawingTool) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const pointer = screenToWorld(screenX, screenY);
    const hitId = findHitElement(scene.elements, pointer.x, pointer.y);

    if (!hitId) {
      return;
    }

    const element = scene.elements.find((item) => item.id === hitId);
    if (
      element?.groupId &&
      selectedIds.length > 1 &&
      selectedIds.includes(element.id)
    ) {
      onSelectElements([element.id]);
      return;
    }

    if (
      !element ||
      (element.type !== "text" &&
        element.type !== "rectangle" &&
        element.type !== "circle")
    ) {
      return;
    }

    beginTextEditing(element);
  };

  const syncEditingOverlayLayout = (serializedValue: string) => {
    setEditingText((current) => {
      if (!current) {
        return current;
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) {
        return { ...current, value: serializedValue };
      }

      const measured = measureRichTextLayout(ctx, serializedValue, {
        fontFamily: current.style.fontFamily,
        fontSize: current.style.fontSize,
        fontWeight: current.style.fontWeight,
        fontStyle: current.style.fontStyle,
      });

      const boundedWidth = current.maxWidth
        ? Math.min(measured.width * camera.zoom, current.maxWidth)
        : measured.width * camera.zoom;
      const nextStartX = getAlignedStartX(
        current.anchorX,
        boundedWidth / camera.zoom,
        current.style.textAlign,
      );
      const nextScreen = worldToScreen(nextStartX, current.anchorY);

      return {
        ...current,
        value: serializedValue,
        left: nextScreen.x,
        top: nextScreen.y,
        width: boundedWidth,
        height: measured.height * camera.zoom,
      };
    });
  };

  const handleEditorChange = (value: Descendant[]) => {
    const nextDocument = value as RichTextDocument;
    setEditingDocument(nextDocument);

    const hasContentChange = editor.operations.some(
      (operation) => operation.type !== "set_selection",
    );

    if (!hasContentChange) {
      return;
    }

    syncEditingOverlayLayout(serializeRichTextDocument(nextDocument));
  };

  const toggleEditorMark = (mark: "bold" | "italic" | "strikethrough") => {
    const marks = Editor.marks(editor) as Record<string, unknown> | null;
    const currentValue = marks?.[mark];

    if (mark === "bold" || mark === "italic") {
      const isBaseActive =
        mark === "bold"
          ? !!editingText &&
            (editingText.style.fontWeight === "bold" ||
              editingText.style.fontWeight === "700" ||
              editingText.style.fontWeight === "800" ||
              editingText.style.fontWeight === "900")
          : !!editingText && editingText.style.fontStyle === "italic";

      if (isBaseActive) {
        Editor.addMark(editor, mark, currentValue === false);
        return;
      }

      if (currentValue === true) {
        Editor.removeMark(editor, mark);
        return;
      }

      Editor.addMark(editor, mark, true);
      return;
    }

    if (currentValue === true) {
      Editor.removeMark(editor, mark);
    } else {
      Editor.addMark(editor, mark, true);
    }
  };

  const uniColor = (color: string) =>
    isDarkMode ? invertLightnessPreservingHue(color) : color;

  const handleCanvasContextMenu = (
    event: React.MouseEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    const pointer = screenToWorld(screenX, screenY);
    contextMenuPointRef.current = pointer;
    lastPointerRef.current = pointer;

    const hitId = findHitElement(scene.elements, pointer.x, pointer.y);
    if (!hitId) {
      onSelectElements([]);
      return;
    }

    const hitElement = scene.elements.find((element) => element.id === hitId);
    if (!hitElement) {
      return;
    }

    const internalSelectKey = event.ctrlKey || event.metaKey;

    if (hitElement.groupId && !internalSelectKey) {
      onSelectGroupForElement(hitElement.id);
      return;
    }

    if (!selectedIds.includes(hitId) || internalSelectKey) {
      onSelectElements([hitId]);
    }
  };

  const handleContextMenuPaste = () => {
    const contextPoint = contextMenuPointRef.current;
    if (!contextPoint) {
      return;
    }

    onPasteAt(contextPoint.x, contextPoint.y);
  };

  return (
    <div
      style={{
        position: "relative",
        width: canvasSize.width,
        height: canvasSize.height,
      }}
    >
      <CanvasContextMenu
        hasSelection={hasSelection}
        canFlipSelection={canFlipSelection}
        selectionType={selectedElementType}
        hasElements={scene.elements.length > 0}
        canUngroupSelection={canUngroupSelection}
        onCut={onCutSelection}
        localeMessages={localeMessages}
        onCopy={onCopySelection}
        onPaste={handleContextMenuPaste}
        onDuplicate={onDuplicateSelection}
        onDelete={onDeleteSelection}
        onGroup={onGroupSelection}
        onUngroup={onUngroupSelection}
        onSelectAll={() => {
          if (scene.elements.length === 0) {
            return;
          }

          onSelectElements(scene.elements.map((element) => element.id));
        }}
        onMoveForward={() => onReorderSelection("forward")}
        onBringToFront={() => onReorderSelection("front")}
        onSendToBack={() => onReorderSelection("back")}
        onMoveBackward={() => onReorderSelection("backward")}
        onFlipHorizontal={() => handleFlipSelectionWithAnimation("horizontal")}
        onFlipVertical={() => handleFlipSelectionWithAnimation("vertical")}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleCanvasContextMenu}
          onMouseDown={(event) => {
            if (event.button === 1) {
              event.preventDefault();
            }
          }}
          onAuxClick={(event) => {
            if (event.button === 1) {
              event.preventDefault();
            }
          }}
          style={{
            display: "block",
            cursor:
              'url("/cursors/' +
              canvasCursor +
              '.svg")' +
              (["default", "pointer", "clone", "laser"].includes(canvasCursor)
                ? ""
                : ["marker", "pencil", "quill"].includes(canvasCursor)
                  ? " -4 26"
                  : " 12 12") +
              ', url("/cursors/default.svg"), auto',
            touchAction: "none",
          }}
        />
      </CanvasContextMenu>
      {scene.elements.length === 0 && !drawingSelection && !drawSelection && (
        <CanvasEmptyState tagline={localeMessages.canvas.tagline} />
      )}

      <TextEditorOverlay
        editorWrapRef={editorWrapRef}
        editor={editor}
        editingText={editingText}
        editingDocument={editingDocument}
        cameraZoom={camera.zoom}
        setEditingDocument={setEditingDocument}
        setEditingText={setEditingText}
        toThemeColor={toThemeColor}
        getTextLineHeight={getTextLineHeight}
        onEditorChange={handleEditorChange}
        onCommitEditingText={() => commitEditingText()}
        onToggleEditorMark={toggleEditorMark}
      />

      {selectionToolbarOverlay && (
        <SelectionToolbar
          toolbarKey={selectionToolbarOverlay.key}
          left={selectionToolbarOverlay.left}
          top={selectionToolbarOverlay.top}
          viewportWidth={canvasSize.width}
        >
          {renderSelectionBarContents()}
        </SelectionToolbar>
      )}
    </div>
  );
};
