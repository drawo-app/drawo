import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import type { DrawElementStyle } from "../core/scene";
import {
  estimateTextHeight,
  estimateTextWidth,
  getTextFont,
  getTextLineHeight,
  getTextRunFont,
  hitTestRectangle,
  measureTextLineWidth,
  parseRichText,
} from "../core/elements";
import { findHitElement } from "../core/hitTest";
import type {
  DrawElement,
  RectangleElement,
  TextElement,
} from "../core/elements";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/select";
import {
  ElegantTypography,
  HandwrittenTypography,
  SimpleTypography,
  TechnicalTypography,
} from "../components/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/tooltip";
import Chrome from "@uiw/react-color-chrome";
import { createEditor, Editor, Transforms, type Descendant } from "slate";
import {
  Editable,
  ReactEditor,
  Slate,
  withReact,
  type RenderLeafProps,
} from "slate-react";
import { withHistory } from "slate-history";
import {
  Bold,
  Italic,
  Strikethrough,
  TextAlignCenter,
  TextAlignLeft,
  TextAlignRight,
} from "@gravity-ui/icons";
import {
  DRAW_STROKE_OPTIONS,
  DRAW_STROKE_PREVIEWS,
  getClosestDrawStrokeOption,
  getClosestMarkerStrokeOption,
  HANDLE_BORDER_RADIUS_PX,
  HANDLE_SIZE,
  MARKER_STROKE_OPTIONS,
  MARKER_STROKE_PREVIEWS,
  MIN_GRID_SCREEN_SPACING,
  RADIUS_HANDLE_OFFSET_PX,
  RADIUS_HANDLE_SIZE_PX,
  STROKE_COLORS,
  TEXT_SELECTION_PADDING_PX,
  SHAPE_TEXT_HORIZONTAL_PADDING_PX,
} from "./constants";
import {
  invertLightnessPreservingHue,
  normalizeRgbTriplet,
  parseColorForPicker,
} from "./color";
import {
  drawCatmullRomCurve,
  getAnimatedDrawPointCount,
  getDrawLineCap,
  getDrawRenderStyle,
  drawMarkerStroke,
  drawRoundedRect,
  drawSmoothStrokePath,
  getVisibleStrokeWidth,
  pruneLaserTrails,
} from "./drawing";
import {
  type CornerAction,
  findCornerAction,
  getAlignedStartX,
  getBoundsCenter,
  getHandleCenter,
  getResizeCursor,
  getRotateCursor,
  getShapeTextAnchorX,
  getTextAlignSelectValue,
  rotatePointAroundCenter,
} from "./geometry";
import {
  deserializeRichTextDocument,
  serializeRichTextDocument,
} from "./richTextDocument";
import type {
  CanvasViewProps,
  DrawSelection,
  DrawingSelection,
  EditableElement,
  EditingTextState,
  ElementBounds,
  LaserTrail,
  MarqueeSelection,
  ResizeHandle,
  RichTextDocument,
  RichTextLeaf,
} from "./types";
export const CanvasView = ({
  scene,
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
  onSelectElements,
  onTextFontFamilyChange,
  onTextFontSizeChange,
  onTextFontWeightChange,
  onTextFontStyleChange,
  onTextAlignChange,
  onDrawStrokeWidthChange,
  onDrawStrokeColorChange,
  onRectangleBorderRadiusChange,
  onGroupResizeStart,
  onGroupRotateStart,
  onResizeStart,
  onRotateStart,
  onTextCommit,
}: CanvasViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const [editingText, setEditingText] = useState<EditingTextState | null>(null);
  const [editingDocument, setEditingDocument] =
    useState<RichTextDocument | null>(null);
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
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
  const [laserTrails, setLaserTrails] = useState<LaserTrail[]>([]);
  const [laserNow, setLaserNow] = useState(() => performance.now());
  const [drawNow, setDrawNow] = useState(() => Date.now());
  const activeLaserTrailIdRef = useRef<string | null>(null);
  const customDrawColorPickerWrapRef = useRef<HTMLDivElement>(null);
  const customDrawColorPickerContentRef = useRef<HTMLDivElement>(null);
  const [isCustomDrawColorPickerOpen, setIsCustomDrawColorPickerOpen] =
    useState(false);
  const [customDrawColorPickerColor, setCustomDrawColorPickerColor] =
    useState<string>("#2f3b52");
  const [activeRadiusElementId, setActiveRadiusElementId] = useState<
    string | null
  >(null);
  const [activeRadiusHandle, setActiveRadiusHandle] =
    useState<ResizeHandle | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const panStateRef = useRef<{ screenX: number; screenY: number } | null>(null);
  const isMiddleMousePanningRef = useRef(false);
  const selectedIds = useMemo(
    () =>
      scene.selectedIds.length > 0
        ? scene.selectedIds
        : scene.selectedId
          ? [scene.selectedId]
          : [],
    [scene.selectedId, scene.selectedIds],
  );
  const canTransformSelection = selectedIds.length === 1;
  const selectedElementId = canTransformSelection ? selectedIds[0] : null;
  const camera = scene.camera;
  const isDarkMode = scene.settings.theme === "dark";

  const getActiveDrawStyle = (
    drawMode: "draw" | "marker",
  ): DrawElementStyle => {
    const selectedDrawElements = scene.elements.filter(
      (element): element is DrawElement =>
        selectedIds.includes(element.id) &&
        element.type === "draw" &&
        (element.drawMode ?? "draw") === drawMode,
    );

    if (selectedDrawElements.length === 0) {
      if (drawMode === "marker") {
        return {
          drawMode,
          stroke: "#f1e66d",
          strokeWidth: MARKER_STROKE_OPTIONS[0],
        };
      }

      return {
        drawMode,
        stroke: "#2f3b52",
        strokeWidth: 2,
      };
    }

    const activeStroke = selectedDrawElements[0].stroke;
    const activeStrokeWidth = selectedDrawElements[0].strokeWidth;

    return {
      drawMode,
      stroke:
        typeof activeStroke === "string" && activeStroke.trim().length > 0
          ? activeStroke
          : "#2f3b52",
      strokeWidth:
        typeof activeStrokeWidth === "number" &&
        Number.isFinite(activeStrokeWidth)
          ? Math.max(1, activeStrokeWidth)
          : 2,
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
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCustomDrawColorPickerOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDownOutside);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDownOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isCustomDrawColorPickerOpen]);

  const getElementBounds = (
    elementId: string,
    ctx?: CanvasRenderingContext2D,
    includeTextPadding: boolean = true,
  ): ElementBounds | null => {
    const element = scene.elements.find((item) => item.id === elementId);
    if (!element) {
      return null;
    }

    if (
      element.type === "rectangle" ||
      element.type === "circle" ||
      element.type === "draw"
    ) {
      return {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
      };
    }

    const width = ctx
      ? measureRichTextLayout(ctx, element.text, {
          fontFamily: element.fontFamily,
          fontSize: element.fontSize,
          fontWeight: element.fontWeight,
          fontStyle: element.fontStyle,
        }).width
      : Math.max(16, estimateTextWidth(element));
    const startX = getAlignedStartX(element.x, width, element.textAlign);
    const textHeight = estimateTextHeight(element);

    const baseBounds = {
      x: startX,
      y: element.y - element.fontSize,
      width,
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

      // Smooth easing for scale
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

      // Enhanced shadow for depth effect
      ctx.shadowColor = `rgba(0, 0, 0, ${shadowOpacity})`;
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1.5 / zoom;

      // Fill and stroke with smooth transitions
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

      // Glow effect for active or hovered state
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

      // Inner highlight for better visual feedback
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

  const selectionToolbarOverlay = (() => {
    if (selectedIds.length === 0) {
      return null;
    }

    if (isDraggingElement || activeResizeHandle || activeRotatingHandle) {
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

  const renderDrawStrokePreview = (
    previews: typeof DRAW_STROKE_PREVIEWS,
    index: number,
  ) => {
    const preview = previews[index] ?? previews[0];
    if (!preview) {
      return null;
    }

    return (
      <svg
        width={preview.width}
        height={preview.height}
        viewBox={preview.viewBox}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d={preview.path}
          stroke="currentColor"
          strokeWidth={preview.strokeWidth}
          strokeLinecap="round"
        />
      </svg>
    );
  };

  const renderSelectionBarContents = () => {
    const selectedTextElements = scene.elements.filter(
      (element): element is EditableElement =>
        selectedIds.includes(element.id) &&
        (element.type === "text" ||
          element.type === "rectangle" ||
          element.type === "circle"),
    );

    const allSameFontFamily =
      selectedTextElements.length > 0 &&
      selectedTextElements.every(
        (element) => element.fontFamily === selectedTextElements[0].fontFamily,
      );
    const allSameTextAlign =
      selectedTextElements.length > 0 &&
      selectedTextElements.every(
        (element) => element.textAlign === selectedTextElements[0].textAlign,
      );

    const selectedTextAlign = allSameTextAlign
      ? selectedTextElements[0].textAlign
      : undefined;
    const selectedTextAlignValue = getTextAlignSelectValue(selectedTextAlign);
    const selectedFontFamily = allSameFontFamily
      ? selectedTextElements[0].fontFamily
      : undefined;
    const allSameFontSize =
      selectedTextElements.length > 0 &&
      selectedTextElements.every(
        (element) => element.fontSize === selectedTextElements[0].fontSize,
      );
    const selectedFontSize = allSameFontSize
      ? selectedTextElements[0].fontSize
      : undefined;
    const allSameFontWeight =
      selectedTextElements.length > 0 &&
      selectedTextElements.every(
        (element) => element.fontWeight === selectedTextElements[0].fontWeight,
      );
    const selectedFontWeight = allSameFontWeight
      ? selectedTextElements[0].fontWeight
      : undefined;
    const allSameFontStyle =
      selectedTextElements.length > 0 &&
      selectedTextElements.every(
        (element) => element.fontStyle === selectedTextElements[0].fontStyle,
      );
    const selectedFontStyle = allSameFontStyle
      ? selectedTextElements[0].fontStyle
      : undefined;
    const isBoldActive =
      selectedFontWeight === "bold" ||
      selectedFontWeight === "700" ||
      selectedFontWeight === "800" ||
      selectedFontWeight === "900";
    const isItalicActive = selectedFontStyle === "italic";
    const activeEditorMarks = editingText
      ? ((Editor.marks(editor) as Record<string, unknown> | null) ?? null)
      : null;

    const isEditingBaseBold =
      editingText &&
      (editingText.style.fontWeight === "bold" ||
        editingText.style.fontWeight === "700" ||
        editingText.style.fontWeight === "800" ||
        editingText.style.fontWeight === "900");
    const isEditingBaseItalic = editingText?.style.fontStyle === "italic";

    const isEditorBoldActive =
      activeEditorMarks?.bold === true ||
      (activeEditorMarks?.bold !== false && isEditingBaseBold);
    const isEditorItalicActive =
      activeEditorMarks?.italic === true ||
      (activeEditorMarks?.italic !== false && isEditingBaseItalic);

    const isElementFullyStrikethrough = (element: EditableElement): boolean => {
      const document = deserializeRichTextDocument(element.text);

      return document.every((paragraph) =>
        paragraph.children.every((leaf) => leaf.strikethrough === true),
      );
    };

    const areAllSelectedElementsStrikethrough =
      selectedTextElements.length > 0 &&
      selectedTextElements.every((element) =>
        isElementFullyStrikethrough(element),
      );

    const isBoldControlActive = editingText ? isEditorBoldActive : isBoldActive;
    const isItalicControlActive = editingText
      ? isEditorItalicActive
      : isItalicActive;
    const isStrikethroughControlActive = editingText
      ? activeEditorMarks?.strikethrough === true
      : areAllSelectedElementsStrikethrough;

    const toggleStrikethroughForSelectedElements = () => {
      const nextValue = !areAllSelectedElementsStrikethrough;

      for (const element of selectedTextElements) {
        const document = deserializeRichTextDocument(element.text);
        const nextDocument: RichTextDocument = document.map((paragraph) => ({
          ...paragraph,
          children: paragraph.children.map((leaf) => ({
            ...leaf,
            strikethrough: nextValue,
          })),
        }));

        onTextCommit(element.id, serializeRichTextDocument(nextDocument));
      }
    };
    const selectedDrawElements = scene.elements.filter(
      (element): element is DrawElement =>
        selectedIds.includes(element.id) && element.type === "draw",
    );

    const allSameDrawMode =
      selectedDrawElements.length > 0 &&
      selectedDrawElements.every(
        (element) =>
          (element.drawMode ?? "draw") ===
          (selectedDrawElements[0]?.drawMode ?? "draw"),
      );
    const selectedDrawMode = allSameDrawMode
      ? (selectedDrawElements[0]?.drawMode ?? "draw")
      : "draw";
    const strokeOptions =
      selectedDrawMode === "marker"
        ? MARKER_STROKE_OPTIONS
        : DRAW_STROKE_OPTIONS;
    const strokePreviews =
      selectedDrawMode === "marker"
        ? MARKER_STROKE_PREVIEWS
        : DRAW_STROKE_PREVIEWS;

    const allSameDrawStrokeWidth =
      selectedDrawElements.length > 0 &&
      selectedDrawElements.every(
        (element) =>
          element.strokeWidth === selectedDrawElements[0].strokeWidth,
      );
    const selectedDrawStrokeWidth =
      selectedDrawMode === "marker"
        ? getClosestMarkerStrokeOption(
            allSameDrawStrokeWidth
              ? selectedDrawElements[0].strokeWidth
              : MARKER_STROKE_OPTIONS[0],
          )
        : getClosestDrawStrokeOption(
            allSameDrawStrokeWidth
              ? selectedDrawElements[0].strokeWidth
              : DRAW_STROKE_OPTIONS[1],
          );
    const selectedDrawStrokeColor =
      selectedDrawElements[0]?.stroke || "#2f3b52";
    const drawStrokeColorSelectValue = STROKE_COLORS.some(
      (color) =>
        color !== "multi" &&
        color.toLowerCase() === selectedDrawStrokeColor.toLowerCase(),
    )
      ? selectedDrawStrokeColor
      : "multi";
    const openCustomDrawColorPicker = (initialColor: string) => {
      setCustomDrawColorPickerColor(parseColorForPicker(initialColor));
      setIsCustomDrawColorPickerOpen(true);
    };

    const renderDrawStrokeSelector = () => (
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <div
          ref={customDrawColorPickerWrapRef}
          style={{ position: "relative", display: "inline-flex" }}
        >
          <Select
            open={isCustomDrawColorPickerOpen || undefined}
            value={String(drawStrokeColorSelectValue)}
            onValueChange={(value) => {
              if (value === "multi") {
                openCustomDrawColorPicker(selectedDrawStrokeColor);
                return;
              }

              setIsCustomDrawColorPickerOpen(false);
              onDrawStrokeColorChange(
                selectedDrawElements.map((element) => element.id),
                value,
              );
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <SelectTrigger
                  onPointerDown={(event) => {
                    if (drawStrokeColorSelectValue !== "multi") {
                      return;
                    }

                    event.preventDefault();
                    event.stopPropagation();
                    openCustomDrawColorPicker(selectedDrawStrokeColor);
                  }}
                  style={{
                    gap: "0px",
                    width: "fit-content",
                  }}
                >
                  <span style={{ width: "0px", overflow: "hidden" }}>
                    <SelectValue
                      placeholder={localeMessages.selectionBar.strokeColor}
                    />
                  </span>
                  <div
                    style={{
                      width: "20px",
                      borderRadius: "100%",
                      border: "1px solid #ffffff20",
                      height: "20px",
                      background: uniColor(
                        selectedDrawStrokeColor || STROKE_COLORS[1],
                      ),
                    }}
                  />
                </SelectTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>{localeMessages.selectionBar.strokeColor}</p>
              </TooltipContent>
            </Tooltip>
            <SelectContent
              position="popper"
              className="drawo-colorselect-content"
            >
              {STROKE_COLORS.map((color) => (
                <SelectItem
                  key={color}
                  value={color}
                  className="drawo-colorselect-item"
                  check={false}
                  onPointerDown={
                    color === "multi"
                      ? (event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          openCustomDrawColorPicker(selectedDrawStrokeColor);
                        }
                      : undefined
                  }
                  onSelect={
                    color === "multi"
                      ? (event) => {
                          event.preventDefault();
                          openCustomDrawColorPicker(selectedDrawStrokeColor);
                        }
                      : undefined
                  }
                >
                  <div
                    style={{
                      border:
                        drawStrokeColorSelectValue === color
                          ? "2px solid var(--accent)"
                          : "2px solid transparent",
                      borderRadius: "100%",
                      padding: "2px",
                    }}
                  >
                    <div
                      style={{
                        width: color === "multi" ? "22px" : "20px",
                        borderRadius: "100%",
                        border:
                          color !== "multi" ? "1px solid #ffffff20" : "none",
                        height: color === "multi" ? "22px" : "20px",
                        background:
                          color === "multi"
                            ? `
                        radial-gradient(circle at center,
                          rgba(255,255,255,1) 0%,
                          rgba(255,255,255,0.85) 10%,
                          rgba(255,255,255,0.55) 22%,
                          rgba(255,255,255,0.15) 40%,
                          transparent 62%
                        ),
                        radial-gradient(circle at 36% 32%, rgba(255,255,255,0.35) 0%, transparent 35%),
                        radial-gradient(circle at 68% 70%, rgba(0,0,0,0.38) 0%, transparent 52%),
                        conic-gradient(
                          from 0deg,
                          hsl(0,   70%, 65%),
                          hsl(30,  72%, 63%),
                          hsl(55,  70%, 62%),
                          hsl(80,  60%, 60%),
                          hsl(120, 55%, 60%),
                          hsl(160, 60%, 58%),
                          hsl(185, 65%, 60%),
                          hsl(210, 68%, 63%),
                          hsl(240, 65%, 66%),
                          hsl(270, 65%, 65%),
                          hsl(300, 65%, 64%),
                          hsl(330, 68%, 64%),
                          hsl(360, 70%, 65%)`
                            : uniColor(color),
                      }}
                    />
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tooltip open={isCustomDrawColorPickerOpen}>
          <TooltipTrigger asChild>
            <div className="selectionbar-separator" />
          </TooltipTrigger>
          <TooltipContent
            className="drawo-content-color"
            side="bottom"
            style={{ background: "transparent" }}
          >
            <div
              ref={customDrawColorPickerContentRef}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <Chrome
                color={customDrawColorPickerColor}
                onChange={(color) => {
                  const next = color.hexa || color.hex;
                  if (next) {
                    setCustomDrawColorPickerColor(next);
                    onDrawStrokeColorChange(
                      selectedDrawElements.map((element) => element.id),
                      next,
                    );
                  }
                }}
              />
            </div>
          </TooltipContent>
        </Tooltip>
        <Select
          value={String(selectedDrawStrokeWidth)}
          onValueChange={(value) => {
            onDrawStrokeWidthChange(
              selectedDrawElements.map((element) => element.id),
              Number(value),
            );
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger
                className="draw-stroke-trigger"
                style={{
                  gap: "0px",
                  width: "fit-content",
                }}
              >
                <span style={{ width: "0px", overflow: "hidden" }}>
                  <SelectValue
                    placeholder={localeMessages.selectionBar.strokeWidth}
                  />
                </span>
                <span className="draw-stroke-option-line-wrap">
                  {renderDrawStrokePreview(
                    strokePreviews,
                    Math.max(
                      0,
                      strokeOptions.findIndex(
                        (option) => option === selectedDrawStrokeWidth,
                      ),
                    ),
                  )}
                </span>
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>{localeMessages.selectionBar.strokeWidth}</p>
            </TooltipContent>
          </Tooltip>
          <SelectContent position="popper">
            {strokeOptions.map((strokeWidth, index) => (
              <SelectItem
                key={strokeWidth}
                check={false}
                value={String(strokeWidth)}
                className="draw-stroke-select-item"
              >
                <span className="draw-stroke-option-line-wrap">
                  {renderDrawStrokePreview(strokePreviews, index)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );

    if (selectedIds.length > 1) {
      if (selectedDrawElements.length === selectedIds.length) {
        return renderDrawStrokeSelector();
      }

      return <></>;
    }

    if (selectedTextElements.length === 0) {
      if (selectedDrawElements.length > 0) {
        return renderDrawStrokeSelector();
      }

      return <></>;
    }

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Select
          value={selectedFontFamily}
          onValueChange={(value) => {
            onTextFontFamilyChange(
              selectedTextElements.map((element) => element.id),
              value,
            );
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger style={{ gap: "0px" }}>
                <span style={{ width: "0px", overflow: "hidden" }}>
                  <SelectValue
                    placeholder={localeMessages.selectionBar.fontFamily}
                  />
                </span>
                {selectedFontFamily === "Shantell Sans" ? (
                  <HandwrittenTypography />
                ) : selectedFontFamily === "Cascadia Code" ? (
                  <TechnicalTypography />
                ) : selectedFontFamily === "Imbue" ? (
                  <ElegantTypography />
                ) : (
                  <SimpleTypography />
                )}
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>{localeMessages.selectionBar.fontFamily}</p>
            </TooltipContent>
          </Tooltip>
          <SelectContent position="popper">
            <SelectItem check={false} value="Rubik">
              {localeMessages.fontFamilies.simple}
            </SelectItem>
            <SelectItem check={false} value="Shantell Sans">
              {localeMessages.fontFamilies.handwritten}
            </SelectItem>
            <SelectItem check={false} value="Imbue">
              {localeMessages.fontFamilies.elegant}
            </SelectItem>
            <SelectItem check={false} value="Cascadia Code">
              {localeMessages.fontFamilies.technical}
            </SelectItem>
          </SelectContent>
        </Select>
        <div className="selectionbar-separator" />
        <Select
          value={selectedFontSize + ""}
          onValueChange={(value) => {
            onTextFontSizeChange(
              selectedTextElements.map((element) => element.id),
              parseInt(value),
            );
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger style={{ gap: "0px" }}>
                <span style={{ width: "0px", overflow: "hidden" }}>
                  <SelectValue placeholder="" />
                </span>
                {selectedFontSize ?? ""}
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>{localeMessages.selectionBar.fontSize}</p>
            </TooltipContent>
          </Tooltip>
          <SelectContent position="popper">
            <SelectItem check={false} className="fontSize-item" value="16">
              {localeMessages.fontSizes.small}{" "}
              <span
                style={{ opacity: 0.5, marginLeft: "auto", display: "flex" }}
              >
                16
              </span>
            </SelectItem>
            <SelectItem check={false} className="fontSize-item" value="24">
              {localeMessages.fontSizes.medium}{" "}
              <span
                style={{ opacity: 0.5, marginLeft: "auto", display: "flex" }}
              >
                24
              </span>
            </SelectItem>
            <SelectItem check={false} className="fontSize-item" value="40">
              {localeMessages.fontSizes.large}{" "}
              <span
                style={{ opacity: 0.5, marginLeft: "auto", display: "flex" }}
              >
                40
              </span>
            </SelectItem>
            <SelectItem check={false} className="fontSize-item" value="64">
              {localeMessages.fontSizes.extraLarge}{" "}
              <span
                style={{ opacity: 0.5, marginLeft: "auto", display: "flex" }}
              >
                64
              </span>
            </SelectItem>
            <SelectItem check={false} className="fontSize-item" value="96">
              {localeMessages.fontSizes.huge}{" "}
              <span
                style={{ opacity: 0.5, marginLeft: "auto", display: "flex" }}
              >
                96
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        <div className="selectionbar-separator" />
        <div style={{ display: "flex" }}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={() => {
                  if (editingText) {
                    toggleEditorMark("bold");
                    ReactEditor.focus(editor);
                    return;
                  }

                  onTextFontWeightChange(
                    selectedTextElements.map((element) => element.id),
                    isBoldControlActive ? "200" : "700",
                  );
                }}
                className={
                  "toggle-selectionbar-button" +
                  (isBoldControlActive ? " active" : "")
                }
              >
                <Bold />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{localeMessages.selectionBar.bold}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={() => {
                  if (editingText) {
                    toggleEditorMark("italic");
                    ReactEditor.focus(editor);
                    return;
                  }

                  onTextFontStyleChange(
                    selectedTextElements.map((element) => element.id),
                    isItalicControlActive ? "normal" : "italic",
                  );
                }}
                className={
                  "toggle-selectionbar-button" +
                  (isItalicControlActive ? " active" : "")
                }
              >
                <Italic />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{localeMessages.selectionBar.italic}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={() => {
                  if (editingText) {
                    toggleEditorMark("strikethrough");
                    ReactEditor.focus(editor);
                    return;
                  }

                  toggleStrikethroughForSelectedElements();
                }}
                className={
                  "toggle-selectionbar-button" +
                  (isStrikethroughControlActive ? " active" : "")
                }
              >
                <Strikethrough />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {localeMessages.selectionBar.strikethrough ||
                  "Strikethrough (Ctrl+S)"}
              </p>
            </TooltipContent>
          </Tooltip>
          <div className="selectionbar-separator" />
          <Select
            value={selectedTextAlignValue}
            onValueChange={(value) => {
              const nextTextAlign: CanvasTextAlign =
                value === "center"
                  ? "center"
                  : value === "end"
                    ? "end"
                    : "left";
              const targetIds = selectedTextElements.map(
                (element) => element.id,
              );

              onTextAlignChange(targetIds, nextTextAlign);

              if (!editingText || !targetIds.includes(editingText.id)) {
                return;
              }

              const editingElement = scene.elements.find(
                (element) => element.id === editingText.id,
              );

              setEditingText((current) => {
                if (!current) {
                  return current;
                }

                const nextAnchorX =
                  editingElement &&
                  (editingElement.type === "rectangle" ||
                    editingElement.type === "circle")
                    ? getShapeTextAnchorX(editingElement, nextTextAlign)
                    : current.anchorX;
                const nextStartX = getAlignedStartX(
                  nextAnchorX,
                  current.width / camera.zoom,
                  nextTextAlign,
                );
                const nextScreen = worldToScreen(nextStartX, current.anchorY);

                return {
                  ...current,
                  anchorX: nextAnchorX,
                  left: nextScreen.x,
                  style: {
                    ...current.style,
                    textAlign: nextTextAlign,
                  },
                };
              });
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <SelectTrigger style={{ gap: "0px" }}>
                  <span style={{ width: "0px", overflow: "hidden" }}>
                    <SelectValue placeholder="" />
                  </span>
                  {selectedTextAlignValue === "left" ? (
                    <TextAlignLeft />
                  ) : selectedTextAlignValue === "center" ? (
                    <TextAlignCenter />
                  ) : (
                    <TextAlignRight />
                  )}
                </SelectTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>{localeMessages.selectionBar.textAlign}</p>
              </TooltipContent>
            </Tooltip>
            <SelectContent
              position="popper"
              className="drawo-colorselect-content"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <SelectItem
                    check={false}
                    className="drawo-textAlign-item"
                    value="left"
                  >
                    <TextAlignLeft />
                  </SelectItem>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{localeMessages.selectionBar.textAlignDirection.left}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SelectItem
                    check={false}
                    className="drawo-textAlign-item"
                    value="center"
                  >
                    <TextAlignCenter />
                  </SelectItem>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{localeMessages.selectionBar.textAlignDirection.center}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SelectItem
                    check={false}
                    className="drawo-textAlign-item"
                    value="end"
                  >
                    <TextAlignRight />
                  </SelectItem>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{localeMessages.selectionBar.textAlignDirection.right}</p>
                </TooltipContent>
              </Tooltip>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };
  const resolveIdleCursor = (
    pointX: number,
    pointY: number,
    altKey: boolean,
  ): string => {
    if (drawingTool) {
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

    return scene.elements
      .filter((element) => {
        if (element.type === "text" && ctx) {
          ctx.font = getTextFont(element);
        }

        const elementBounds = getElementBounds(element.id, ctx, true);
        if (!elementBounds) {
          return false;
        }

        return intersectsBounds(marqueeBounds, elementBounds);
      })
      .map((element) => element.id);
  };

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
      const dotSize = 2 / camera.zoom;
      const dotOffset = dotSize / 2;
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

      ctx.fillStyle = isDarkMode ? "#ffffff10" : "#B3B2B370";

      for (let x = startX; x <= worldRight; x += renderGridStep) {
        for (let y = startY; y <= worldBottom; y += renderGridStep) {
          ctx.fillRect(x - dotOffset, y - dotOffset, dotSize, dotSize);
        }
      }
    }

    for (const element of scene.elements) {
      const isSelected = selectedIds.includes(element.id);
      const isMarqueePreview =
        marqueeSelection !== null &&
        marqueePreviewIds.includes(element.id) &&
        !isSelected;
      const isMultiSelection = selectedIds.length > 1;
      const rotationRadians = (element.rotation * Math.PI) / 180;

      if (element.type === "draw") {
        const drawMode = element.drawMode ?? "draw";
        const bounds = {
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
        };
        const center = getBoundsCenter(bounds);

        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.rotate(rotationRadians);
        ctx.translate(-center.x, -center.y);

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
          ctx.lineCap = getDrawLineCap(drawMode);

          const worldPoints = element.points.map((point) => ({
            x: element.x + point.x,
            y: element.y + point.y,
          }));
          const revealedPointCount = getAnimatedDrawPointCount(
            worldPoints.length,
            element.createdAt,
            drawNow,
            220,
          );
          const visibleWorldPoints = worldPoints.slice(0, revealedPointCount);

          if (visibleWorldPoints.length === 1) {
            if (drawMode === "marker") {
              drawMarkerStroke(ctx, visibleWorldPoints, visibleStrokeWidth);
            } else {
              ctx.beginPath();
              ctx.arc(
                visibleWorldPoints[0].x,
                visibleWorldPoints[0].y,
                ctx.lineWidth / 2,
                0,
                Math.PI * 2,
              );
              ctx.fillStyle = toThemeColor(element.stroke);
              ctx.fill();
            }
          } else if (visibleWorldPoints.length > 1) {
            if (drawMode === "marker") {
              drawMarkerStroke(ctx, visibleWorldPoints, visibleStrokeWidth);
            } else {
              ctx.beginPath();
              drawSmoothStrokePath(ctx, visibleWorldPoints);
              ctx.stroke();
            }
          }

          ctx.globalCompositeOperation = previousComposite;
          ctx.globalAlpha = previousAlpha;
        }

        if (isSelected) {
          ctx.strokeStyle = isMultiSelection
            ? accentSelectionColor
            : accentColor;
          ctx.lineWidth = 1 / camera.zoom;
          ctx.strokeRect(element.x, element.y, element.width, element.height);

          if (canTransformSelection) {
            drawResizeHandles(ctx, bounds, camera.zoom, accentColor);
          }
        } else if (isMarqueePreview) {
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 1 / camera.zoom;
          ctx.strokeRect(element.x, element.y, element.width, element.height);
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
        ctx.translate(center.x, center.y);
        ctx.rotate(rotationRadians);
        ctx.translate(-center.x, -center.y);

        ctx.fillStyle = toThemeColor(element.fill);
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
          ctx.fill();
        } else {
          drawRoundedRect(
            ctx,
            element.x,
            element.y,
            element.width,
            element.height,
            rectangleRadius,
          );
          ctx.fill();
        }

        ctx.strokeStyle = toThemeColor(element.stroke);
        ctx.lineWidth = element.strokeWidth / camera.zoom;
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
          ctx.stroke();
        } else {
          drawRoundedRect(
            ctx,
            element.x,
            element.y,
            element.width,
            element.height,
            rectangleRadius,
          );
          ctx.stroke();
        }

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

        if (isSelected) {
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

        if (isSelected && canTransformSelection) {
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

      if (isSelected) {
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

    if (selectedIds.length > 1) {
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
      ctx.lineCap = getDrawLineCap(drawSelection.drawMode);

      if (drawSelection.points.length === 1) {
        if (drawSelection.drawMode === "marker") {
          drawMarkerStroke(ctx, drawSelection.points, visibleStrokeWidth);
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
      ctx.fillStyle = "#ff1424";

      for (const trail of laserTrails) {
        if (trail.points.length === 0) {
          continue;
        }

        drawCatmullRomCurve(ctx, trail.points, laserNow, camera);
      }

      ctx.restore();
    }

    ctx.restore();
  });

  useEffect(() => {
    if (!editingText || !editingDocument) {
      return;
    }

    requestAnimationFrame(() => {
      ReactEditor.focus(editor);
      const end = Editor.end(editor, []);
      Transforms.select(editor, end);
    });
  }, [editor, editingDocument, editingText]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        const hotkey = event.key.toLowerCase();
        if (hotkey === "b" || hotkey === "i") {
          if (editingText) {
            return;
          }

          const selectedTextElements = scene.elements.filter(
            (element): element is EditableElement =>
              selectedIds.includes(element.id) &&
              (element.type === "text" ||
                element.type === "rectangle" ||
                element.type === "circle"),
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
    scene.elements,
    selectedElementId,
    selectedIds,
    editingText,
    onTextFontWeightChange,
    onTextFontStyleChange,
    beginTextEditing,
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
    if (laserTrails.length === 0) {
      return;
    }

    let animationFrame = 0;

    const animate = () => {
      const now = performance.now();
      setLaserNow(now);
      setLaserTrails((current) => pruneLaserTrails(current, now));
      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [laserTrails.length]);

  useEffect(() => {
    const revealWindowMs = 240;
    const hasRecentlyCreatedDraw = scene.elements.some(
      (element) =>
        element.type === "draw" &&
        typeof element.createdAt === "number" &&
        Date.now() - element.createdAt >= 0 &&
        Date.now() - element.createdAt < revealWindowMs,
    );

    if (!hasRecentlyCreatedDraw) {
      return;
    }

    let animationFrame = 0;

    const animate = () => {
      setDrawNow(Date.now());
      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [scene.elements]);

  // Force re-render when fonts are loaded to update canvas text rendering
  const fontsLoadedRef = useRef(false);
  const [, setRenderTrigger] = useState(0);
  useEffect(() => {
    const handleFontsLoaded = () => {
      if (!fontsLoadedRef.current) {
        fontsLoadedRef.current = true;
        // Defer the state update to avoid synchronous setState in effect
        setTimeout(() => {
          setRenderTrigger((prev) => prev + 1);
        }, 0);
      }
    };

    // Check if fonts are already loaded
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
      setActiveRotatingHandle(null);
      setActiveResizeHandle(null);
      setMarqueeSelection(null);
      setIsDraggingElement(false);
      setIsDuplicateDragging(false);
      setCanvasCursor("grabbing");
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    if (drawingTool) {
      if (editingText) {
        commitEditingText();
      }

      if (drawingTool === "laser") {
        const now = performance.now();
        const trailId = `laser-${now}-${Math.random().toString(36).slice(2, 7)}`;

        setLaserNow(now);
        setLaserTrails((current) => [
          ...pruneLaserTrails(current, now),
          {
            id: trailId,
            points: [{ x: pointer.x, y: pointer.y, t: now }],
          },
        ]);
        activeLaserTrailIdRef.current = trailId;
      } else if (drawingTool === "draw" || drawingTool === "marker") {
        const drawMode = drawingTool;
        const drawStyle = getActiveDrawStyle(drawMode);

        setDrawSelection({
          points: [pointer],
          stroke: drawStyle.stroke,
          strokeWidth: drawStyle.strokeWidth,
          drawMode,
          isLine: e.shiftKey,
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

      setCanvasCursor("crosshair");
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

        if (selectedElement?.type === "text") {
          ctx.font = getTextFont(selectedElement);
        }

        const bounds = getElementBounds(selectedElementId, ctx, true);
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
    const duplicateDragging = dragging && e.altKey;
    setActiveRotatingHandle(null);
    setActiveResizeHandle(null);
    setMarqueeSelection(null);
    setIsDraggingElement(dragging);
    setIsDuplicateDragging(duplicateDragging);
    setCanvasCursor(
      dragging ? (duplicateDragging ? "clone" : "grabbing") : "default",
    );

    onPointerDown(pointer.x, pointer.y, e.altKey, e.shiftKey);
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
        const now = performance.now();

        setLaserNow(now);
        setLaserTrails((current) => {
          const trailId = activeLaserTrailIdRef.current;
          if (!trailId) {
            return pruneLaserTrails(current, now);
          }

          return pruneLaserTrails(
            current.map((trail) => {
              if (trail.id !== trailId) {
                return trail;
              }

              const previousPoint = trail.points[trail.points.length - 1];
              const minimumDistance = 0.3 / camera.zoom;

              if (
                previousPoint &&
                Math.hypot(
                  pointer.x - previousPoint.x,
                  pointer.y - previousPoint.y,
                ) < minimumDistance
              ) {
                return trail;
              }

              return {
                ...trail,
                points: [
                  ...trail.points,
                  { x: pointer.x, y: pointer.y, t: now },
                ],
              };
            }),
            now,
          );
        });
      } else if (drawingTool === "draw" || drawingTool === "marker") {
        setDrawSelection((current) => {
          if (!current) {
            return current;
          }

          const isLineMode = e.shiftKey;
          let constrainedPointer = pointer;

          // For line mode (shift key), constrain to horizontal or vertical
          if (isLineMode && current.points.length > 0) {
            const startPoint = current.points[0];
            const deltaX = Math.abs(pointer.x - startPoint.x);
            const deltaY = Math.abs(pointer.y - startPoint.y);

            // Determine direction based on which delta is larger
            if (deltaX > deltaY) {
              // Horizontal ruler: lock Y to start point
              constrainedPointer = { x: pointer.x, y: startPoint.y };
            } else {
              // Vertical ruler: lock X to start point
              constrainedPointer = { x: startPoint.x, y: pointer.y };
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

          return {
            ...current,
            currentX: pointer.x,
            currentY: pointer.y,
            fromCenter: e.altKey,
            lockAspect: e.shiftKey,
          };
        });
      }

      setCanvasCursor("crosshair");
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
        let nextRadius = 0;

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
        activeLaserTrailIdRef.current = null;
      } else if (drawingTool === "draw" || drawingTool === "marker") {
        if (drawSelection && drawSelection.points.length > 1) {
          onCreateDrawElement(drawSelection.points, {
            drawMode: drawSelection.drawMode,
            stroke: drawSelection.stroke,
            strokeWidth: drawSelection.strokeWidth,
          });
        }

        setDrawSelection(null);
      } else if (drawingSelection) {
        const drawingBounds = getDrawingBounds(drawingSelection);
        onCreateElement(
          drawingSelection.type,
          drawingBounds.x,
          drawingBounds.y,
          localeMessages,
          drawingBounds,
        );
        setDrawingSelection(null);
        onDrawingToolComplete();
      }

      setActiveRadiusElementId(null);
      setActiveRadiusHandle(null);
      setCanvasCursor("crosshair");
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
      onSelectElements(selectedInMarquee);
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
        activeLaserTrailIdRef.current = null;
      }
      setCanvasCursor("crosshair");
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

  const handleInputBlur = () => {
    requestAnimationFrame(() => {
      const activeElement = document.activeElement;
      if (editorWrapRef.current?.contains(activeElement)) {
        return;
      }

      commitEditingText();
    });
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

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      commitEditingText();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      toggleEditorMark("bold");
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      toggleEditorMark("italic");
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      toggleEditorMark("strikethrough");
      return;
    }

    if (e.key === "Escape") {
      setEditingDocument(null);
      setEditingText(null);
    }
  };

  const renderLeaf = useCallback(
    ({ attributes, children, leaf }: RenderLeafProps) => {
      const richLeaf = leaf as RichTextLeaf;

      return (
        <span
          {...attributes}
          style={{
            fontWeight:
              richLeaf.bold === true
                ? 700
                : richLeaf.bold === false
                  ? 400
                  : undefined,
            fontStyle:
              richLeaf.italic === true
                ? "italic"
                : richLeaf.italic === false
                  ? "normal"
                  : undefined,
            textDecorationLine:
              richLeaf.strikethrough === true ? "line-through" : "none",
            textDecorationColor:
              richLeaf.strikethrough === true ? "currentColor" : undefined,
            textDecorationThickness:
              richLeaf.strikethrough === true ? "0.05em" : undefined,
          }}
        >
          {children}
        </span>
      );
    },
    [],
  );

  const uniColor = (color: string) =>
    isDarkMode ? invertLightnessPreservingHue(color) : color;

  return (
    <div
      style={{
        position: "relative",
        width: canvasSize.width,
        height: canvasSize.height,
      }}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onDoubleClick={handleDoubleClick}
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
            (["default", "pointer", "clone"].includes(canvasCursor)
              ? ""
              : " 12 12") +
            ', url("/cursors/default.svg"), auto',
          touchAction: "none",
        }}
      />

      {scene.elements.length === 0 && !drawingSelection && !drawSelection && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            opacity: 0.5,
            flexDirection: "column",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <svg
            height="10vh"
            viewBox="0 0 102 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M1.46447 18.5355C2.92893 20 5.28595 20 10 20C14.714 20 17.0711 20 18.5355 18.5355C20 17.0711 20 14.714 20 10C20 5.28595 20 2.92893 18.5355 1.46447C17.0711 -1.19209e-07 14.714 0 10 0C5.28595 0 2.92893 -1.19209e-07 1.46447 1.46447C-1.19209e-07 2.92893 0 5.28595 0 10C0 14.714 -1.19209e-07 17.0711 1.46447 18.5355Z"
              fill={"var(--accent)"}
            />
            <path
              d="M8.0773 14.8618L4.5652 5.69598C4.2836 4.96107 4.9611 4.28361 5.696 4.56521L14.8618 8.0773C15.6922 8.3955 15.7192 9.56 14.9019 9.8083L11.4249 10.8648C11.1545 10.947 10.947 11.1545 10.8648 11.4249L9.8083 14.9019C9.56 15.7192 8.3955 15.6922 8.0773 14.8618Z"
              fill={"#FFFFFF"}
            />
            <g opacity="0.8">
              <path
                d="M31.1877 19.4999H26.9043C25.2474 19.4999 23.9043 18.1568 23.9043 16.4999V3.57056C23.9043 1.9137 25.2474 0.570557 26.9043 0.570557H31.1137C33.0609 0.570557 34.7431 0.949514 36.1603 1.70743C37.5837 2.45918 38.6806 3.54368 39.4508 4.96092C40.2272 6.37199 40.6154 8.06344 40.6154 10.0352C40.6154 12.0071 40.2303 13.7016 39.46 15.1188C38.6898 16.5299 37.5991 17.6144 36.1881 18.3723C34.777 19.1241 33.1102 19.4999 31.1877 19.4999ZM29.0433 13.1778C29.0433 14.26 29.9206 15.1373 31.0028 15.1373C31.9394 15.1373 32.7374 14.9863 33.3967 14.6844C34.0622 14.3825 34.5675 13.8618 34.9125 13.1224C35.2638 12.3829 35.4394 11.3539 35.4394 10.0352C35.4394 8.7166 35.2607 7.68756 34.9033 6.94813C34.5521 6.2087 34.0345 5.68802 33.3505 5.38609C32.6727 5.08416 31.8408 4.93319 30.8549 4.93319C29.8544 4.93319 29.0433 5.74427 29.0433 6.74479V13.1778Z"
                fill="var(--accent)"
              />
              <path
                d="M44.577 19.4999C43.1681 19.4999 42.0259 18.3578 42.0259 16.9489V7.77999C42.0259 6.41193 43.135 5.3029 44.503 5.3029H45.6307C46.376 5.3029 46.9801 5.90708 46.9801 6.65236V7.91845C46.9801 7.96449 47.0175 8.00182 47.0635 8.00182C47.1015 8.00182 47.1347 7.97599 47.1445 7.9393C47.4041 6.97305 47.8083 6.2637 48.3573 5.81126C48.9242 5.34912 49.5866 5.11805 50.3445 5.11805C50.5664 5.11805 50.7851 5.13653 51.0008 5.1735C51.3851 5.22688 51.6385 5.57748 51.6385 5.96546V8.7103C51.6385 9.17873 51.1703 9.52572 50.705 9.47144C50.3353 9.4283 50.0179 9.40674 49.753 9.40674C49.2539 9.40674 48.804 9.52073 48.4035 9.74872C48.0092 9.97055 47.698 10.2848 47.47 10.6915C47.242 11.092 47.128 11.5634 47.128 12.1057V16.9489C47.128 18.3578 45.9859 19.4999 44.577 19.4999Z"
                fill="var(--accent)"
              />
              <path
                d="M55.5655 19.7218C54.6596 19.7218 53.8586 19.5739 53.1623 19.2781C52.4722 18.9762 51.9299 18.5202 51.5356 17.9102C51.1412 17.3001 50.944 16.5237 50.944 15.581C50.944 14.8046 51.0765 14.1422 51.3415 13.5938C51.6064 13.0392 51.9761 12.5863 52.4506 12.2351C52.9251 11.8838 53.4766 11.6158 54.1051 11.4309C54.7398 11.2461 55.4237 11.1259 56.157 11.0705C56.9519 11.0088 57.5896 10.9349 58.0703 10.8486C58.5571 10.7562 58.9083 10.6299 59.124 10.4697C59.3396 10.3033 59.4475 10.0845 59.4475 9.81342V9.77645C59.4475 9.40674 59.3057 9.12329 59.0223 8.92611C58.7388 8.72893 58.3753 8.63033 57.9316 8.63033C57.4448 8.63033 57.0474 8.73817 56.7393 8.95384C56.1987 9.32892 55.7047 9.92434 55.0467 9.92434H54.0504C52.6715 9.92434 51.5541 8.68551 52.3212 7.53968C52.8142 6.80641 53.532 6.22103 54.4748 5.78353C55.4176 5.33988 56.5945 5.11805 58.0056 5.11805C59.0223 5.11805 59.9342 5.2382 60.7415 5.47852C61.5487 5.71267 62.2357 6.04233 62.8026 6.4675C63.3695 6.88651 63.8008 7.37947 64.0966 7.94636C64.3985 8.5071 64.5495 9.11713 64.5495 9.77645V17.1153C64.5495 18.4323 63.4819 19.4999 62.1649 19.4999H60.7784C60.2271 19.4999 59.7802 19.053 59.7802 18.5017V17.5728C59.7802 17.5345 59.7491 17.5035 59.7108 17.5035C59.6853 17.5035 59.6618 17.5176 59.6495 17.5401C59.3698 18.0532 59.0314 18.4692 58.6341 18.7882C58.2336 19.1148 57.7745 19.3521 57.2569 19.4999C56.7455 19.6478 56.1816 19.7218 55.5655 19.7218ZM57.2292 16.5053C57.6174 16.5053 57.9809 16.4252 58.3198 16.2649C58.6649 16.1047 58.9453 15.8737 59.1609 15.5717C59.3766 15.2698 59.4844 14.9032 59.4844 14.4718V13.7508C59.4844 13.5303 59.26 13.3787 59.05 13.4459C58.9021 13.4952 58.7419 13.5414 58.5694 13.5845C58.403 13.6276 58.2243 13.6677 58.0333 13.7047C57.8484 13.7416 57.6543 13.7755 57.451 13.8063C57.0566 13.868 56.7331 13.9696 56.4805 14.1114C56.234 14.2469 56.0492 14.4164 55.9259 14.6197C55.8088 14.8169 55.7503 15.0387 55.7503 15.2852C55.7503 15.6796 55.889 15.9815 56.1662 16.191C56.4435 16.4005 56.7978 16.5053 57.2292 16.5053Z"
                fill="var(--accent)"
              />
              <path
                d="M70.8026 19.4999C69.426 19.4999 68.226 18.5631 67.8922 17.2275L65.662 8.30702C65.2805 6.78108 66.4347 5.3029 68.0076 5.3029C69.1706 5.3029 70.1688 6.1309 70.3837 7.27385L71.6295 13.8992C71.6355 13.9311 71.6634 13.9542 71.6958 13.9542C71.7278 13.9542 71.7554 13.9318 71.762 13.9005L73.0629 7.68804C73.3539 6.2983 74.5793 5.3029 75.9992 5.3029H76.1044C77.513 5.3029 78.732 6.28299 79.0344 7.6588L80.3904 13.8271C80.3972 13.8582 80.4247 13.8803 80.4564 13.8803C80.4892 13.8803 80.5172 13.8569 80.523 13.8247L81.707 7.28457C81.9147 6.13723 82.9136 5.3029 84.0796 5.3029C85.6483 5.3029 86.7993 6.77708 86.4188 8.29889L84.1867 17.2275C83.8528 18.5631 82.6528 19.4999 81.2762 19.4999H80.4248C79.0609 19.4999 77.8687 18.58 77.5228 17.2606L76.1321 11.9553C76.1211 11.9132 76.083 11.8838 76.0394 11.8838C75.9958 11.8838 75.9578 11.9132 75.9467 11.9553L74.556 17.2606C74.2102 18.58 73.0179 19.4999 71.6541 19.4999H70.8026Z"
                fill="var(--accent)"
              />
              <path
                d="M94.2651 19.7587C92.7246 19.7587 91.4059 19.4537 90.3091 18.8437C89.2123 18.2275 88.3712 17.371 87.7858 16.2742C87.2004 15.1712 86.9077 13.8926 86.9077 12.4384C86.9077 10.9842 87.2004 9.70867 87.7858 8.61185C88.3712 7.50887 89.2123 6.65236 90.3091 6.04233C91.4059 5.42614 92.7246 5.11805 94.2651 5.11805C95.8055 5.11805 97.1242 5.42614 98.221 6.04233C99.3178 6.65236 100.159 7.50887 100.744 8.61185C101.33 9.70867 101.622 10.9842 101.622 12.4384C101.622 13.8926 101.33 15.1712 100.744 16.2742C100.159 17.371 99.3178 18.2275 98.221 18.8437C97.1242 19.4537 95.8055 19.7587 94.2651 19.7587ZM94.302 15.9877C94.7334 15.9877 95.1062 15.8429 95.4204 15.5532C95.7347 15.2636 95.9781 14.8508 96.1506 14.3147C96.3231 13.7786 96.4094 13.1409 96.4094 12.4014C96.4094 11.6558 96.3231 11.0181 96.1506 10.4882C95.9781 9.95206 95.7347 9.53922 95.4204 9.24961C95.1062 8.96 94.7334 8.81519 94.302 8.81519C93.846 8.81519 93.4548 8.96 93.1282 9.24961C92.8016 9.53922 92.552 9.95206 92.3795 10.4882C92.207 11.0181 92.1207 11.6558 92.1207 12.4014C92.1207 13.1409 92.207 13.7786 92.3795 14.3147C92.552 14.8508 92.8016 15.2636 93.1282 15.5532C93.4548 15.8429 93.846 15.9877 94.302 15.9877Z"
                fill="var(--accent)"
              />
            </g>
          </svg>
          <p style={{ fontFamily: "Shantell Sans", fontSize: "24px" }}>
            {/* placeholder asthetick here */}
            {localeMessages.canvas.tagline}
          </p>
        </div>
      )}

      {editingText && (
        <div
          ref={editorWrapRef}
          style={{
            position: "absolute",
            left: editingText.left,
            top: editingText.top,
            width: editingText.width,
            height: editingText.height,
            maxWidth: editingText.maxWidth,
            margin: 0,
            padding: 0,
            border: "none",
            outline: "none",
            cursor: 'url("/cursors/text.svg") 12 12, auto',
            background: "transparent",
            boxShadow: "none",
            color: toThemeColor(editingText.style.color),
            fontFamily: editingText.style.fontFamily,
            fontSize: editingText.style.fontSize * camera.zoom,
            fontWeight: editingText.style.fontWeight,
            fontStyle: editingText.style.fontStyle,
            textAlign: editingText.style.textAlign,
            lineHeight: `${getTextLineHeight(editingText.style.fontSize) * camera.zoom}px`,
          }}
        >
          <Slate
            editor={editor}
            initialValue={
              (editingDocument ??
                deserializeRichTextDocument(editingText.value)) as Descendant[]
            }
            onChange={handleEditorChange}
          >
            <Editable
              renderLeaf={renderLeaf}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              spellCheck={false}
              style={{
                width: "100%",
                height: "100%",
                minHeight: `${editingText.style.fontSize * camera.zoom}px`,
                outline: "none",
                whiteSpace: "pre",
                wordBreak: "normal",
                background: "transparent",
              }}
            />
          </Slate>
        </div>
      )}

      {selectionToolbarOverlay && (
        <div
          key={selectionToolbarOverlay.key}
          className="selection-toolbar"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
          style={{
            left: selectionToolbarOverlay.left,
            top: selectionToolbarOverlay.top,
          }}
        >
          {renderSelectionBarContents()}
        </div>
      )}
    </div>
  );
};
